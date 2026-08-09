import axios from 'axios';
import useAuthStore from '../store/authStore';
import { isTokenExpired } from '../utils/tokenUtils';

// Create an Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

// Request interceptor for adding the bearer token
api.interceptors.request.use(
  (config) => {
    const { token, logout } = useAuthStore.getState();
    if (token) {
      if (isTokenExpired(token)) {
        logout();
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling 401s (e.g., token expired)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
