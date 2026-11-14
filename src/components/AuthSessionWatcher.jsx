import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import useAuthStore from '../store/authStore';
import { hasRefreshToken, refreshAccessToken } from '../services/authSession';
import { createActivityTracker } from '../utils/activityTracker';
import {
  getTokenExpirationTime,
  getTokenLifetime,
  getTokenRefreshTime,
} from '../utils/tokenUtils';

/** Refresh when 75% of the access token's lifetime has elapsed. */
const REFRESH_RATIO = 0.75;

/**
 * How recently the user must have interacted for a background timer to
 * proactively refresh the token right away. If the user is idle or on another
 * tab, we simply wait until they return or interact rather than logging out.
 */
function getIdleWindowMs(token) {
  const configured = Number(import.meta.env.VITE_SESSION_IDLE_MS);
  if (configured > 0) return configured;
  const lifetime = getTokenLifetime(token);
  if (lifetime) {
    return Math.max(2 * 60 * 1000, Math.min(15 * 60 * 1000, Math.round(lifetime * 0.25)));
  }
  return 15 * 60 * 1000;
}

function isFatalRefreshError(error) {
  if (!error) return false;
  if (error.code === 'NO_REFRESH_TOKEN' || error.code === 'SESSION_CLOSED') return true;
  return error.status === 401 || error.status === 403 || error.status === 400;
}

const AUTH_STORAGE_KEY = 'auth-storage';

export default function AuthSessionWatcher() {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  /* Keep tabs in sync: a login, refresh, or logout in one tab is reflected in
     every other open tab. */
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== AUTH_STORAGE_KEY) return;
      useAuthStore.persist.rehydrate();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) return undefined;

    const tracker = createActivityTracker();
    tracker.start();

    let refreshTimer = null;
    let retryTimer = null;
    let finished = false;

    const clearTimers = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      if (retryTimer) clearTimeout(retryTimer);
      refreshTimer = null;
      retryTimer = null;
    };

    const endSession = () => {
      if (finished) return;
      finished = true;
      clearTimers();
      tracker.stop();
      logout();
      message.warning('Your session has expired. Please log in again.');
      navigate('/login', { replace: true });
    };

    const performRefresh = async () => {
      if (finished) return;

      if (!hasRefreshToken()) {
        const currentToken = useAuthStore.getState().token;
        const expiresAt = getTokenExpirationTime(currentToken);
        if (!expiresAt || Date.now() >= expiresAt) {
          endSession();
        }
        return;
      }

      try {
        await refreshAccessToken();
        // Store update re-runs this effect and schedules the next 75% timer.
      } catch (error) {
        if (finished) return;
        if (isFatalRefreshError(error)) {
          endSession();
          return;
        }
        // Transient network / server cold-start error: keep the session alive
        // and retry in 30 seconds instead of kicking the user out.
        retryTimer = setTimeout(() => {
          if (!finished && document.visibilityState === 'visible') {
            performRefresh();
          }
        }, 30 * 1000);
      }
    };

    const evaluate = () => {
      if (finished) return;

      const currentToken = useAuthStore.getState().token;
      if (!currentToken) return;

      const expiresAt = getTokenExpirationTime(currentToken);
      const refreshAt = getTokenRefreshTime(currentToken, REFRESH_RATIO);
      const idleWindow = getIdleWindowMs(currentToken);

      if (!expiresAt || Date.now() >= expiresAt) {
        // Access token expired (e.g., computer slept or tab was backgrounded):
        // silently rotate using the 30-day refresh token if available.
        performRefresh();
        return;
      }

      if (refreshAt && Date.now() >= refreshAt) {
        // Only proactively refresh in the background if the user is active on
        // this tab. If idle or hidden, wait until they return/interact rather
        // than logging them out.
        if (tracker.isActive(idleWindow)) {
          performRefresh();
        }
      }
    };

    const schedule = () => {
      clearTimers();
      if (finished) return;

      const currentToken = useAuthStore.getState().token;
      const refreshAt = getTokenRefreshTime(currentToken, REFRESH_RATIO);
      const expiresAt = getTokenExpirationTime(currentToken);

      if (!refreshAt || !expiresAt) return;

      const now = Date.now();
      if (now >= refreshAt) {
        evaluate();
        return;
      }

      refreshTimer = setTimeout(evaluate, Math.max(0, refreshAt - now));
    };

    const refreshIfDue = () => {
      if (finished) return;
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) return;
      const refreshAt = getTokenRefreshTime(currentToken, REFRESH_RATIO);
      if (refreshAt && Date.now() >= refreshAt) {
        performRefresh();
      }
    };

    const handleVisibility = () => {
      if (finished || document.visibilityState !== 'visible') return;
      tracker.markActive();
      refreshIfDue();
    };

    const handleFocus = () => {
      if (finished || document.visibilityState !== 'visible') return;
      tracker.markActive();
      refreshIfDue();
    };

    // If the user was idle past the 75% mark and now clicks/types on the page,
    // immediately refresh the token so they stay logged in seamlessly.
    const handleUserWake = () => {
      if (finished || document.visibilityState !== 'visible') return;
      refreshIfDue();
    };

    schedule();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pointerdown', handleUserWake, { passive: true, capture: true });
    window.addEventListener('keydown', handleUserWake, { passive: true, capture: true });

    return () => {
      finished = true;
      clearTimers();
      tracker.stop();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pointerdown', handleUserWake, { passive: true, capture: true });
      window.removeEventListener('keydown', handleUserWake, { passive: true, capture: true });
    };
  }, [token, isAuthenticated, logout, navigate]);

  return null;
}
