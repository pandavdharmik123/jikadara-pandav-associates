/**
 * Minimal fetch client for the auth refresh/logout endpoints.
 *
 * Kept dependency-free (no axios, no store import) so both the Zustand store
 * and the axios interceptors can use it without a circular import.
 */

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

async function readError(response) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    // non-JSON error body
  }
  const error = new Error(data?.error || `Request failed (${response.status})`);
  error.status = response.status;
  error.code = data?.code;
  error.data = data;
  return error;
}

/** Exchange a refresh token for a new access + refresh token pair. */
export async function requestTokenRefresh(refreshToken) {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) throw await readError(response);
  return response.json();
}

/**
 * Revoke a refresh-token family. Fire-and-forget: local logout must never be
 * blocked by a network failure.
 */
export function revokeToken(refreshToken) {
  if (!refreshToken) return Promise.resolve();

  return fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    keepalive: true,
  }).catch(() => undefined);
}
