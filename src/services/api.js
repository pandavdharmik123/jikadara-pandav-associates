import axios from 'axios';
import useAuthStore from '../store/authStore';

// Create an Axios instance
const api = axios.create({
  baseURL: 'http://localhost:3001/api', // Adjust in production
});

// Request interceptor for adding the bearer token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
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
      // Clear auth state and potentially redirect to login
      useAuthStore.getState().logout();
      // Optional: window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
