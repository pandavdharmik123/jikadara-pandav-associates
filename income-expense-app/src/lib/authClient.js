import { API_BASE_URL } from './config';

async function readError(response) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON error body.
  }

  const error = new Error(data?.error || `Request failed (${response.status})`);
  error.status = response.status;
  error.code = data?.code;
  error.data = data;
  return error;
}

/** Exchange a refresh token for a new access + refresh token pair. */
export async function requestTokenRefresh(refreshToken) {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) throw await readError(response);
  return response.json();
}

/**
 * Revoke the refresh-token family and blacklist the current access token.
 * Fire-and-forget: local logout should never wait on the network.
 */
export function revokeSession({ refreshToken, token } = {}) {
  if (!refreshToken && !token) return Promise.resolve();

  return fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ refreshToken }),
    keepalive: true,
  }).catch(() => undefined);
}
