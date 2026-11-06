/**
 * In-memory blacklist for revoked access tokens (e.g. after explicit logout).
 * Entries expire and are purged automatically based on their TTL.
 */
const revokedTokens = new Map();

export const tokenBlacklist = {
  revoke(token, ttlMs = 15 * 60 * 1000) {
    if (!token) return;
    const expiresAt = Date.now() + ttlMs;
    revokedTokens.set(token, expiresAt);

    if (revokedTokens.size > 2000) {
      const now = Date.now();
      for (const [t, exp] of revokedTokens.entries()) {
        if (exp <= now) revokedTokens.delete(t);
      }
    }
  },

  isRevoked(token) {
    if (!token) return false;
    const expiresAt = revokedTokens.get(token);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
      revokedTokens.delete(token);
      return false;
    }
    return true;
  },
};

export default tokenBlacklist;
