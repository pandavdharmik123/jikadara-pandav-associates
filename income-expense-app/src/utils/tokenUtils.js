/**
 * Decode a JWT payload without verifying the signature (the server is the
 * authority). Returns null for malformed tokens.
 */
export function getTokenPayload(token) {
  if (!token) return null;
  try {
    const parts = String(token).split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Parse JWT token expiration time in milliseconds
 */
export function getTokenExpirationTime(token) {
  const payload = getTokenPayload(token);
  return payload?.exp ? payload.exp * 1000 : null;
}

/** Parse JWT issued-at time in milliseconds. */
export function getTokenIssuedAt(token) {
  const payload = getTokenPayload(token);
  return payload?.iat ? payload.iat * 1000 : null;
}

/** Full token lifetime in milliseconds (exp - iat). */
export function getTokenLifetime(token) {
  const issuedAt = getTokenIssuedAt(token);
  const expiresAt = getTokenExpirationTime(token);
  if (!issuedAt || !expiresAt || expiresAt <= issuedAt) return null;
  return expiresAt - issuedAt;
}

/**
 * Timestamp at which a sliding session should refresh (75% of the token's
 * lifetime by default).
 */
export function getTokenRefreshTime(token, ratio = 0.75) {
  const issuedAt = getTokenIssuedAt(token);
  const lifetime = getTokenLifetime(token);
  if (!issuedAt || !lifetime) return null;
  return issuedAt + lifetime * ratio;
}

/**
 * Check if the token is expired
 */
export function isTokenExpired(token) {
  const exp = getTokenExpirationTime(token);
  if (!exp) return true;
  return Date.now() >= exp;
}
