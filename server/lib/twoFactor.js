import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

const SERVICE_NAME = 'AdvocateManagement';

/**
 * Generate a new TOTP secret, OTP Auth URI, and QR Code Data URL
 * @param {string} userEmail
 * @returns {Promise<{ secret: string, otpauth: string, qrCode: string }>}
 */
export async function generateTOTP(userEmail) {
  const secret = generateSecret();
  const otpauth = generateURI({
    secret,
    label: userEmail,
    issuer: SERVICE_NAME,
  });

  const qrCode = await QRCode.toDataURL(otpauth, {
    width: 250,
    margin: 2,
    color: {
      dark: '#1e293b',
      light: '#ffffff',
    },
  });

  return {
    secret,
    otpauth,
    qrCode,
  };
}

/**
 * Verify a 6-digit TOTP token against a base32 secret
 * @param {string} token
 * @param {string} secret
 * @returns {boolean}
 */
export function verifyTOTP(token, secret) {
  if (!token || !secret) return false;
  const cleanToken = token.toString().trim();
  try {
    const result = verifySync({
      token: cleanToken,
      secret,
      timeTolerance: 30, // 30s clock drift tolerance
    });
    return Boolean(result && result.valid);
  } catch (err) {
    console.error('Error verifying TOTP:', err);
    return false;
  }
}

/**
 * Generate a set of 8 random alphanumeric backup recovery codes
 * Returns the plain text codes (to display once to the user) and their SHA-256 hashes (to store in DB)
 * @returns {{ plainCodes: string[], hashedCodes: string[] }}
 */
export function generateBackupCodes() {
  const plainCodes = [];
  const hashedCodes = [];

  for (let i = 0; i < 8; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    const hash = crypto.createHash('sha256').update(formatted).digest('hex');

    plainCodes.push(formatted);
    hashedCodes.push(hash);
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verify if a submitted code matches any stored backup code hash
 * @param {string} code
 * @param {string[]} storedHashedCodes
 * @returns {{ isValid: boolean, remainingHashes: string[] }}
 */
export function verifyAndConsumeBackupCode(code, storedHashedCodes = []) {
  if (!code || !Array.isArray(storedHashedCodes) || storedHashedCodes.length === 0) {
    return { isValid: false, remainingHashes: storedHashedCodes };
  }

  const cleanCode = code.trim().toUpperCase();
  const hash = crypto.createHash('sha256').update(cleanCode).digest('hex');

  const index = storedHashedCodes.indexOf(hash);
  if (index !== -1) {
    const remainingHashes = [...storedHashedCodes];
    remainingHashes.splice(index, 1);
    return { isValid: true, remainingHashes };
  }

  return { isValid: false, remainingHashes: storedHashedCodes };
}
