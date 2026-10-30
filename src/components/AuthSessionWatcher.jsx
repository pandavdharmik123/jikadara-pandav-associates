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
 * How recently the user must have interacted for the session to count as active.
 * If VITE_SESSION_IDLE_MS is set, it overrides this. Otherwise, scale dynamically
 * with the token lifetime (e.g. 15 minutes for a 1h token, min 2 minutes).
 */
function getIdleTimeoutMs(token) {
  const configured = Number(import.meta.env.VITE_SESSION_IDLE_MS);
  if (configured > 0) return configured;
  const lifetime = getTokenLifetime(token);
  if (lifetime) {
    return Math.max(2 * 60 * 1000, Math.min(15 * 60 * 1000, Math.round(lifetime * 0.25)));
  }
  return 15 * 60 * 1000;
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
    let expiryTimer = null;
    let finished = false;
    let hiddenAt = null;

    const clearTimers = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      if (expiryTimer) clearTimeout(expiryTimer);
      refreshTimer = null;
      expiryTimer = null;
    };

    const endSession = (reason) => {
      if (finished) return;
      finished = true;
      clearTimers();
      tracker.stop();
      logout();
      message.warning(
        reason === 'idle'
          ? 'You were signed out due to inactivity.'
          : 'Your session has expired. Please log in again.'
      );
      navigate('/login', { replace: true });
    };

    const evaluate = async () => {
      if (finished) return;

      const currentToken = useAuthStore.getState().token;
      if (!currentToken) return;

      const expiresAt = getTokenExpirationTime(currentToken);
      const idleTimeout = getIdleTimeoutMs(currentToken);

      if (!expiresAt || Date.now() >= expiresAt) {
        // If expired (e.g. system sleep/throttle), try refreshing before ending the session
        if (hasRefreshToken()) {
          try {
            await refreshAccessToken();
            return;
          } catch {
            // Refresh failed or revoked
          }
        }
        endSession('expired');
        return;
      }

      // 75% mark reached: no recent browser activity -> end the session.
      if (!tracker.isActive(idleTimeout)) {
        endSession('idle');
        return;
      }

      // Sessions created before refresh tokens existed keep working until the
      // access token's hard expiry.
      if (!hasRefreshToken()) return;

      try {
        await refreshAccessToken();
        // The store update re-runs this effect, which clears the old timers and
        // schedules the next 75% check for the fresh token.
      } catch {
        if (!finished) endSession('expired');
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
      if (now >= expiresAt) {
        evaluate();
        return;
      }

      refreshTimer = setTimeout(evaluate, Math.max(0, refreshAt - now));
      // Safety net: check expiry and refresh if valid, else end session
      expiryTimer = setTimeout(evaluate, Math.max(0, expiresAt - now) + 250);
    };

    const handleVisibility = () => {
      if (finished) return;

      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }

      const resumedAt = Date.now();
      const wasHiddenAt = hiddenAt;
      hiddenAt = null;
      tracker.markActive();

      const currentToken = useAuthStore.getState().token;
      const refreshAt = getTokenRefreshTime(currentToken, REFRESH_RATIO);
      if (!refreshAt) return;

      if (resumedAt >= refreshAt) {
        const idleTimeout = getIdleTimeoutMs(currentToken);
        // Only treat as idle if the user has truly been inactive for longer than idleTimeout
        const wasAwayTooLong = wasHiddenAt !== null && (resumedAt - wasHiddenAt > idleTimeout);
        if (wasAwayTooLong || tracker.getIdleFor() > idleTimeout) {
          endSession('idle');
          return;
        }
        evaluate();
        return;
      }

      schedule();
    };

    const handleFocus = () => {
      if (finished || document.visibilityState !== 'visible') return;
      const currentToken = useAuthStore.getState().token;
      const refreshAt = getTokenRefreshTime(currentToken, REFRESH_RATIO);
      if (refreshAt && Date.now() >= refreshAt) evaluate();
    };

    schedule();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      finished = true;
      clearTimers();
      tracker.stop();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [token, isAuthenticated, logout, navigate]);

  return null;
}
