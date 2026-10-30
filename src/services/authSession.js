import useAuthStore from '../store/authStore';
import { requestTokenRefresh, revokeToken } from './tokenClient';

/**
 * Single-flight refresh coordinator.
 *
 * The 75%-lifetime scheduler and any number of failing axios requests all share
 * one in-flight refresh, so the refresh token is rotated exactly once.
 */
let inFlight = null;

async function exchange(refreshToken) {
  const data = await requestTokenRefresh(refreshToken);

  if (!data?.token || !data?.refreshToken) {
    throw new Error('The server returned an incomplete session.');
  }

  // The user may have logged out (or another tab may have ended the session)
  // while this request was in flight. Never resurrect a closed session.
  if (!useAuthStore.getState().isAuthenticated) {
    revokeToken(data.refreshToken);
    const error = new Error('The session was closed during refresh.');
    error.code = 'SESSION_CLOSED';
    throw error;
  }

  useAuthStore.getState().updateSession({
    user: data.user,
    token: data.token,
    refreshToken: data.refreshToken,
  });

  return data.token;
}

export function hasRefreshToken() {
  return Boolean(useAuthStore.getState().refreshToken);
}

/**
 * Refresh the current session. Resolves with the new access token.
 */
export function refreshAccessToken() {
  if (inFlight) return inFlight;

  const usedToken = useAuthStore.getState().refreshToken;
  if (!usedToken) {
    const error = new Error('No refresh token is available.');
    error.code = 'NO_REFRESH_TOKEN';
    return Promise.reject(error);
  }

  inFlight = (async () => {
    try {
      return await exchange(usedToken);
    } catch (error) {
      // Another tab may have rotated the token and synced a newer one into the
      // store while this request was in flight. Retry once with that token.
      const latest = useAuthStore.getState().refreshToken;
      if (latest && latest !== usedToken) return await exchange(latest);
      throw error;
    }
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
