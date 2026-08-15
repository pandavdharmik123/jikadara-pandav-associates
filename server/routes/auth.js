import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import {
  generateTOTP,
  verifyTOTP,
  generateBackupCodes,
  verifyAndConsumeBackupCode,
} from '../lib/twoFactor.js';

const router = Router();

const USER_SELECT_FIELDS = {
  id: true,
  email: true,
  name: true,
  mobileNumber: true,
  role: true,
  isActive: true,
  allowedPages: true,
  twoFactorEnabled: true,
  securityPinHash: true,
  createdAt: true,
};

/**
 * Helper to strip sensitive hashes and return safe user object with boolean flags
 */
function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, securityPinHash, twoFactorSecret, backupCodes, ...safeUser } = user;
  return {
    ...safeUser,
    hasSecurityPin: !!securityPinHash,
  };
}

/**
 * Generate JWT token for a user session
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

/**
 * POST /api/auth/register
 * Admin-only: create a new user with a specific role, mobileNumber, and allowedPages
 */
router.post('/register', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { email, password, name, mobileNumber, role, allowedPages } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name.trim(),
        mobileNumber: mobileNumber ? mobileNumber.trim() : '',
        role: role || 'JUNIOR',
        allowedPages: Array.isArray(allowedPages) ? allowedPages : [],
      },
      select: USER_SELECT_FIELDS,
    });

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * POST /api/auth/login
 * Public: authenticate user with email + password from database.
 * If user has 2FA enabled, returns a temporary token for TOTP code submission.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated. Contact admin.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user has TOTP 2FA enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // Issue short-lived 2FA pending token (10 minutes)
      const tempToken = jwt.sign(
        { id: user.id, is2faPending: true },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );

      return res.json({
        require2FA: true,
        tempToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }

    // 2FA not enabled: issue full session directly
    const token = generateToken(user);

    res.json({
      require2FA: false,
      user: sanitizeUser(user),
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

/**
 * POST /api/auth/2fa/verify-login
 * Verify 6-digit TOTP code (or 8-character backup code) on login
 */
router.post('/2fa/verify-login', async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ error: 'Verification session and 6-digit code are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Verification session expired. Please log in again.' });
    }

    if (!decoded.is2faPending || !decoded.id) {
      return res.status(401).json({ error: 'Invalid verification session' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User account not found or deactivated' });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: 'Two-factor authentication is not configured for this account' });
    }

    const cleanCode = code.toString().trim();
    let isVerified = verifyTOTP(cleanCode, user.twoFactorSecret);
    let usedBackupCode = false;

    // If TOTP verification failed, check if it's a valid backup recovery code
    if (!isVerified && user.backupCodes && user.backupCodes.length > 0) {
      const backupResult = verifyAndConsumeBackupCode(cleanCode, user.backupCodes);
      if (backupResult.isValid) {
        isVerified = true;
        usedBackupCode = true;

        // Update remaining backup codes in DB
        await prisma.user.update({
          where: { id: user.id },
          data: { backupCodes: backupResult.remainingHashes },
        });
      }
    }

    if (!isVerified) {
      return res.status(400).json({ error: 'Invalid 6-digit code or backup code. Please check and try again.' });
    }

    // Generate final session JWT token
    const token = generateToken(user);

    res.json({
      message: usedBackupCode ? 'Logged in with backup code' : 'Verification successful',
      user: sanitizeUser(user),
      token,
    });
  } catch (err) {
    console.error('Verify 2FA login error:', err);
    res.status(500).json({ error: 'Failed to verify 2FA code' });
  }
});

/**
 * GET /api/auth/2fa/setup
 * Protected: Generate secret and QR code for user to scan in Google Authenticator / Microsoft Auth
 */
router.get('/2fa/setup', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { secret, otpauth, qrCode } = await generateTOTP(user.email);

    res.json({
      secret,
      otpauth,
      qrCode,
    });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ error: 'Failed to generate 2FA setup details' });
  }
});

/**
 * POST /api/auth/2fa/enable
 * Protected: Verify first code and activate 2FA for the account
 */
router.post('/2fa/enable', requireAuth, async (req, res) => {
  try {
    const { secret, code } = req.body;

    if (!secret || !code) {
      return res.status(400).json({ error: 'Secret key and verification code are required' });
    }

    const isValid = verifyTOTP(code, secret);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid 6-digit code. Please ensure your authenticator app time is synced.' });
    }

    // Generate backup recovery codes
    const { plainCodes, hashedCodes } = generateBackupCodes();

    // Save 2FA to user record
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        backupCodes: hashedCodes,
      },
      select: USER_SELECT_FIELDS,
    });

    res.json({
      message: 'Two-factor authentication enabled successfully!',
      user: updatedUser,
      backupCodes: plainCodes,
    });
  } catch (err) {
    console.error('2FA enable error:', err);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

/**
 * POST /api/auth/2fa/disable
 * Protected: Disable 2FA (requires current password for security)
 */
router.post('/2fa/disable', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Current password is required to disable 2FA' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
      },
      select: USER_SELECT_FIELDS,
    });

    res.json({
      message: 'Two-factor authentication disabled successfully',
      user: updatedUser,
    });
  } catch (err) {
    console.error('2FA disable error:', err);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

/**
 * POST /api/auth/2fa/generate-backup-codes
 * Protected: Generate new backup codes (replaces old ones)
 */
router.post('/2fa/generate-backup-codes', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Current password is required to regenerate backup codes' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA is not enabled on this account' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    const { plainCodes, hashedCodes } = generateBackupCodes();

    await prisma.user.update({
      where: { id: user.id },
      data: { backupCodes: hashedCodes },
    });

    res.json({
      message: 'New backup codes generated',
      backupCodes: plainCodes,
    });
  } catch (err) {
    console.error('Regenerate backup codes error:', err);
    res.status(500).json({ error: 'Failed to generate backup codes' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Public: direct password update via registered email
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User with this email does not exist' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated. Contact admin.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

/**
 * GET /api/auth/me
 * Protected: get current authenticated user
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: USER_SELECT_FIELDS,
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * PUT /api/auth/me
 * Protected: update current authenticated user's profile (name & mobileNumber)
 */
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { name, mobileNumber } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name.trim(),
        mobileNumber: mobileNumber ? mobileNumber.trim() : '',
      },
      select: USER_SELECT_FIELDS,
    });

    res.json({ user: sanitizeUser(user), message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * PUT /api/auth/change-password
 * Protected: change password for current authenticated user
 */
router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /api/auth/pin/verify
 * Protected: verify current user's security PIN
 */
router.post('/pin/verify', requireAuth, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'Security PIN is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.securityPinHash) {
      return res.status(400).json({ error: 'No Security PIN configured for this account', hasSecurityPin: false });
    }

    const valid = await bcrypt.compare(pin.toString().trim(), user.securityPinHash);
    if (!valid) {
      return res.status(400).json({ error: 'Incorrect PIN. Please try again.' });
    }

    res.json({ success: true, message: 'PIN verified successfully' });
  } catch (err) {
    console.error('Verify PIN error:', err);
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

/**
 * POST /api/auth/pin/set
 * Protected: set or update current user's security PIN
 */
router.post('/pin/set', requireAuth, async (req, res) => {
  try {
    const { newPin, currentPin, password } = req.body;

    if (!newPin || !/^\d{4,6}$/.test(newPin.toString().trim())) {
      return res.status(400).json({ error: 'PIN must be 4 to 6 numeric digits' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If PIN is already set, verify currentPin or password
    if (user.securityPinHash) {
      let isAuthorized = false;
      if (currentPin) {
        isAuthorized = await bcrypt.compare(currentPin.toString().trim(), user.securityPinHash);
      }
      if (!isAuthorized && password) {
        isAuthorized = await bcrypt.compare(password, user.passwordHash);
      }
      if (!isAuthorized) {
        return res.status(400).json({ error: 'Current PIN or password is required and incorrect' });
      }
    } else {
      // First time setting PIN: verify account password
      if (!password) {
        return res.status(400).json({ error: 'Account password is required to set security PIN' });
      }
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(400).json({ error: 'Incorrect account password' });
      }
    }

    const securityPinHash = await bcrypt.hash(newPin.toString().trim(), 12);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { securityPinHash },
      select: USER_SELECT_FIELDS,
    });

    res.json({
      message: 'Security PIN saved successfully',
      user: sanitizeUser(updatedUser),
    });
  } catch (err) {
    console.error('Set PIN error:', err);
    res.status(500).json({ error: 'Failed to set security PIN' });
  }
});

/**
 * POST /api/auth/pin/remove
 * Protected: remove user's security PIN using account password
 */
router.post('/pin/remove', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Account password is required to remove security PIN' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: 'Incorrect account password' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { securityPinHash: null },
      select: USER_SELECT_FIELDS,
    });

    res.json({
      message: 'Security PIN removed successfully',
      user: sanitizeUser(updatedUser),
    });
  } catch (err) {
    console.error('Remove PIN error:', err);
    res.status(500).json({ error: 'Failed to remove security PIN' });
  }
});

/**
 * GET /api/auth/users
 * Admin-only: list all users
 */
router.get('/users', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: USER_SELECT_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users: users.map(sanitizeUser) });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PUT /api/auth/users/:id
 * Admin-only: update user role, active status, name, mobileNumber, allowedPages, or reset 2FA / PIN
 */
router.put('/users/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { role, isActive, name, mobileNumber, allowedPages, reset2FA, resetPin } = req.body;
    const data = {};
    if (role) data.role = role;
    if (typeof isActive === 'boolean') data.isActive = isActive;
    if (name) data.name = name.trim();
    if (mobileNumber !== undefined) data.mobileNumber = mobileNumber.trim();
    if (Array.isArray(allowedPages)) data.allowedPages = allowedPages;

    if (reset2FA) {
      data.twoFactorEnabled = false;
      data.twoFactorSecret = null;
      data.backupCodes = [];
    }

    if (resetPin) {
      data.securityPinHash = null;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: USER_SELECT_FIELDS,
    });

    res.json({ user: sanitizeUser(user), message: reset2FA ? 'User 2FA reset successfully' : resetPin ? 'User PIN reset successfully' : 'User updated successfully' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/auth/users/:id
 * Admin-only: delete a user
 */
router.delete('/users/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
