import axios from 'axios';
import useAuthStore from '../store/authStore';
import { refreshAccessToken } from './authSession';
import { isTokenExpired } from '../utils/tokenUtils';

// Create an Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

// These endpoints either establish a session or are used by the refresh flow
// itself, so they must never trigger a refresh-and-retry loop.
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/2fa/'];

function canRefreshRequest(config) {
  if (!config || config._retry) return false;
  const url = config.url || '';
  return !NO_REFRESH_PATHS.some((path) => url.includes(path));
}

// Request interceptor: attach the current access token, refreshing first if it
// has already expired (e.g. the machine slept through the 75% timer).
api.interceptors.request.use(
  async (config) => {
    let { token } = useAuthStore.getState();

    if (token && isTokenExpired(token) && canRefreshRequest(config)) {
      try {
        token = await refreshAccessToken();
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: a 401 (clock drift, revoked family, server restart) is
// retried once with a freshly rotated access token.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const original = error.config;

    if (status === 401 && canRefreshRequest(original)) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers = {
          ...(original.headers || {}),
          Authorization: `Bearer ${token}`,
        };
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    }

    if (status === 401 && !NO_REFRESH_PATHS.some((path) => (original?.url || '').includes(path))) {
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  }
);

export default api;
