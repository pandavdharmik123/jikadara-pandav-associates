import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

const USER_SELECT_FIELDS = {
  id: true,
  email: true,
  name: true,
  mobileNumber: true,
  role: true,
  isActive: true,
  allowedPages: true,
  createdAt: true,
};

/**
 * Generate JWT token for a user
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * POST /api/auth/register
 * Admin-only: create a new user with a specific role, mobileNumber, and allowedPages
 */
router.post('/register', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { email, password, name, mobileNumber, role, allowedPages } = req.body;

    if (!email || !password || !name || !mobileNumber) {
      return res.status(400).json({ error: 'Email, password, full name, and mobile number are required' });
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
        mobileNumber: mobileNumber.trim(),
        role: role || 'JUNIOR',
        allowedPages: Array.isArray(allowedPages) ? allowedPages : [],
      },
      select: USER_SELECT_FIELDS,
    });

    res.status(201).json({ user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * POST /api/auth/login
 * Public: authenticate user with email + password
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

    const token = generateToken(user);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mobileNumber: user.mobileNumber || '',
        role: user.role,
        isActive: user.isActive,
        allowedPages: user.allowedPages || [],
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
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

    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * PUT /api/auth/me
 * Protected: update current authenticated user's profile (name & mobileNumber)
 * Note: email cannot be changed
 */
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { name, mobileNumber } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    if (!mobileNumber || !mobileNumber.trim()) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
      },
      select: USER_SELECT_FIELDS,
    });

    res.json({ user, message: 'Profile updated successfully' });
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
 * GET /api/auth/users
 * Admin-only: list all users
 */
router.get('/users', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: USER_SELECT_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PUT /api/auth/users/:id
 * Admin-only: update user role, active status, name, mobileNumber, or allowedPages
 */
router.put('/users/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { role, isActive, name, mobileNumber, allowedPages } = req.body;
    const data = {};
    if (role) data.role = role;
    if (typeof isActive === 'boolean') data.isActive = isActive;
    if (name) data.name = name.trim();
    if (mobileNumber !== undefined) data.mobileNumber = mobileNumber.trim();
    if (Array.isArray(allowedPages)) data.allowedPages = allowedPages;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: USER_SELECT_FIELDS,
    });

    res.json({ user });
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
