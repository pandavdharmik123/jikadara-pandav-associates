import useAuthStore from '../store/authStore';
import { requestTokenRefresh, revokeSession } from './authClient';

let inFlight = null;

async function exchange(refreshToken) {
  const data = await requestTokenRefresh(refreshToken);

  if (!data?.token || !data?.refreshToken) {
    throw new Error('The server returned an incomplete session.');
  }

  // A logout in another tab may have closed the session while this was in flight.
  if (!useAuthStore.getState().isAuthenticated) {
    revokeSession({ refreshToken: data.refreshToken, token: data.token });
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
 * Single-flight refresh. Any number of failing requests share one rotation,
 * so the refresh token is only consumed once.
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
      const latest = useAuthStore.getState().refreshToken;
      if (latest && latest !== usedToken) return await exchange(latest);
      throw error;
    }
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
