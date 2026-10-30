import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from './prisma.js';

/**
 * Sliding-session tokens.
 *
 * Access tokens are short-lived JWTs. Refresh tokens are opaque 384-bit random
 * strings; only their SHA-256 hash is stored, so a database leak cannot be
 * replayed. Each login gets a `familyId`, and every refresh rotates the token
 * inside that family.
 */

export const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '1h';
export const REFRESH_TOKEN_TTL_DAYS = Math.max(
  1,
  Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30)
);

// A rotated token may still be presented for a few seconds by a second browser
// tab that has not received the new token yet. Reuse after this window is
// treated as token theft and revokes the whole family.
export const REFRESH_ROTATION_GRACE_MS =
  Math.max(0, Number(process.env.REFRESH_ROTATION_GRACE_SECONDS || 60)) * 1000;

const ONE_HOUR_MS = 60 * 60 * 1000;
let lastCleanupAt = 0;

export class RefreshTokenError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = 'RefreshTokenError';
    this.status = status;
  }
}

export function signAccessToken(user, familyId = null) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      typ: 'access',
      ...(familyId ? { sid: familyId } : {}),
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

export function generateRefreshTokenValue() {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function refreshExpiryDate() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Remove expired rows and rotation rows that are no longer useful. */
function scheduleCleanup() {
  if (Date.now() - lastCleanupAt < ONE_HOUR_MS) return;
  lastCleanupAt = Date.now();
  const now = new Date();
  prisma.refreshToken
    .deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revokedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        ],
      },
    })
    .catch((error) => console.error('Refresh-token cleanup failed:', error));
}

/**
 * Create a refresh token row. Returns the plaintext token exactly once; callers
 * must send it to the client and never store it themselves.
 */
export async function createRefreshToken({
  userId,
  familyId = crypto.randomUUID(),
  userAgent = null,
}) {
  const token = generateRefreshTokenValue();
  const expiresAt = refreshExpiryDate();
  const tokenHash = hashRefreshToken(token);

  await prisma.refreshToken.create({
    data: {
      userId,
      familyId,
      tokenHash,
      expiresAt,
      userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
    },
  });

  scheduleCleanup();

  return { token, tokenHash, familyId, expiresAt };
}

function withinGrace(revokedAt) {
  return Date.now() - new Date(revokedAt).getTime() <= REFRESH_ROTATION_GRACE_MS;
}

async function revokeFamily(familyId) {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Validate + rotate a refresh token.
 *
 * Returns `{ token, familyId, expiresAt, user }` with a brand-new refresh
 * token. Throws `RefreshTokenError` for invalid, expired, revoked, or reused
 * tokens.
 */
export async function rotateRefreshToken(rawToken, { userAgent = null } = {}) {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new RefreshTokenError('Refresh token is required', 400);
  }

  const tokenHash = hashRefreshToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!existing) {
    throw new RefreshTokenError('Invalid refresh token');
  }

  if (!existing.user || !existing.user.isActive) {
    await revokeFamily(existing.familyId);
    throw new RefreshTokenError('User account is not active', 403);
  }

  const now = new Date();

  if (existing.expiresAt <= now) {
    if (!existing.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: now },
      });
    }
    throw new RefreshTokenError('Refresh token has expired');
  }

  // Already rotated: allow a short multi-tab grace window, then treat reuse as
  // compromise and revoke every token in the login family.
  if (existing.revokedAt) {
    if (!existing.replacedBy) {
      throw new RefreshTokenError('Refresh token has been revoked');
    }
    if (!withinGrace(existing.revokedAt)) {
      await revokeFamily(existing.familyId);
      throw new RefreshTokenError('Refresh token reuse detected; session revoked');
    }
    const forked = await createRefreshToken({
      userId: existing.userId,
      familyId: existing.familyId,
      userAgent,
    });
    return { ...forked, user: existing.user };
  }

  const next = generateRefreshTokenValue();
  const nextHash = hashRefreshToken(next);
  const expiresAt = refreshExpiryDate();

  // Claim the old row atomically. If a parallel request already rotated it we
  // fall back to the grace-window path above instead of issuing two successors.
  const claimed = await prisma.refreshToken.updateMany({
    where: { id: existing.id, revokedAt: null },
    data: { revokedAt: now, replacedBy: nextHash, lastUsedAt: now },
  });

  if (claimed.count === 0) {
    const current = await prisma.refreshToken.findUnique({
      where: { id: existing.id },
    });
    if (current?.revokedAt && current.replacedBy && withinGrace(current.revokedAt)) {
      const forked = await createRefreshToken({
        userId: existing.userId,
        familyId: existing.familyId,
        userAgent,
      });
      return { ...forked, user: existing.user };
    }
    if (current?.revokedAt) {
      await revokeFamily(existing.familyId);
    }
    throw new RefreshTokenError('Refresh token reuse detected; session revoked');
  }

  await prisma.refreshToken.create({
    data: {
      userId: existing.userId,
      familyId: existing.familyId,
      tokenHash: nextHash,
      expiresAt,
      userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
    },
  });

  scheduleCleanup();

  return { token: next, tokenHash: nextHash, familyId: existing.familyId, expiresAt, user: existing.user };
}

/** Revoke the whole login family (all tabs/devices of this login). */
export async function revokeRefreshToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return;
  const tokenHash = hashRefreshToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: { familyId: true },
  });
  if (!existing) return;
  await revokeFamily(existing.familyId);
}

/** Build the login/refresh response shared by every auth flow. */
export async function createSessionTokens(user, userAgent) {
  const refresh = await createRefreshToken({ userId: user.id, userAgent });
  return {
    token: signAccessToken(user, refresh.familyId),
    refreshToken: refresh.token,
    refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
    accessTokenTtl: ACCESS_TOKEN_TTL,
  };
}
