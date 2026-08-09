import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import useAuthStore from '../store/authStore';
import { getTokenExpirationTime, isTokenExpired } from '../utils/tokenUtils';

export default function AuthSessionWatcher() {
  const { token, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const checkAndScheduleLogout = () => {
      if (isTokenExpired(token)) {
        logout();
        message.warning('Your session has expired. Please log in again.');
        navigate('/login');
        return null;
      }

      const expTime = getTokenExpirationTime(token);
      if (!expTime) return null;

      const remainingMs = expTime - Date.now();
      if (remainingMs <= 0) {
        logout();
        message.warning('Your session has expired. Please log in again.');
        navigate('/login');
        return null;
      }

      // Schedule timer for exact moment of expiration
      const timer = setTimeout(() => {
        logout();
        message.warning('Your session has expired. Please log in again.');
        navigate('/login');
      }, remainingMs);

      return timer;
    };

    const timer = checkAndScheduleLogout();

    // Check expiration when user focuses back on the tab/window
    const handleFocus = () => {
      if (isTokenExpired(token)) {
        logout();
        message.warning('Your session has expired. Please log in again.');
        navigate('/login');
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [token, isAuthenticated, logout, navigate]);

  return null;
}
