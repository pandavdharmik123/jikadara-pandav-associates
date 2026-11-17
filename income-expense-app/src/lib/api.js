import axios from 'axios';
import useAuthStore from '../store/authStore';
import { refreshAccessToken } from './authSession';
import { isTokenExpired } from './tokenUtils';
import { API_BASE_URL } from './config';

const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/2fa/'];

function canRefreshRequest(config) {
  if (!config || config._retry) return false;
  const url = config.url || '';
  return !NO_REFRESH_PATHS.some((path) => url.includes(path));
}

function handleSessionExpired() {
  useAuthStore.getState().clearSession();
  if (!window.location.hash.startsWith('#/login')) {
    window.location.hash = '#/login';
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(
  async (config) => {
    let { token } = useAuthStore.getState();

    if (token && isTokenExpired(token) && canRefreshRequest(config)) {
      try {
        token = await refreshAccessToken();
      } catch {
        handleSessionExpired();
        throw new axios.CanceledError('Session expired');
      }
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (
      error.response?.status === 401 &&
      config &&
      canRefreshRequest(config) &&
      useAuthStore.getState().refreshToken
    ) {
      try {
        const token = await refreshAccessToken();
        config._retry = true;
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      } catch {
        handleSessionExpired();
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401 && canRefreshRequest(config)) {
      handleSessionExpired();
    }

    return Promise.reject(error);
  }
);

export default api;
