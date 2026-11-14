/** Decode a JWT payload without verifying the signature. */
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

export function getTokenExpirationTime(token) {
  const payload = getTokenPayload(token);
  return payload?.exp ? payload.exp * 1000 : null;
}

export function isTokenExpired(token) {
  const exp = getTokenExpirationTime(token);
  if (!exp) return true;
  return Date.now() >= exp;
}
