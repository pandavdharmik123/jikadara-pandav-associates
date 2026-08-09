/**
 * Parse JWT token expiration time in milliseconds
 */
export function getTokenExpirationTime(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed.exp ? parsed.exp * 1000 : null;
  } catch (e) {
    return null;
  }
}

/**
 * Check if the token is expired
 */
export function isTokenExpired(token) {
  const exp = getTokenExpirationTime(token);
  if (!exp) return true;
  return Date.now() >= exp;
}
