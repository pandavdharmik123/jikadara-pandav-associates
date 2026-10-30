import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isTokenExpired } from '../utils/tokenUtils';
import { revokeToken } from '../services/tokenClient';

const EMPTY_SESSION = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  activeFinancialYear: null,
};

const useAuthStore = create(
  persist(
    (set, get) => ({
      ...EMPTY_SESSION,

      login: (user, token, refreshToken = null) =>
        set({ user, token, refreshToken, isAuthenticated: true }),

      /**
       * Replace the token pair after a successful background refresh. The user
       * object is also refreshed so role/page changes take effect immediately.
       */
      updateSession: ({ user, token, refreshToken }) =>
        set((state) => ({
          user: user || state.user,
          token,
          refreshToken: refreshToken ?? state.refreshToken,
          isAuthenticated: true,
        })),

      logout: () => {
        const { refreshToken } = get();
        // Revoke the server-side family in the background. Clearing local state
        // immediately keeps logout instantaneous even when offline.
        if (refreshToken) revokeToken(refreshToken);
        set({ ...EMPTY_SESSION });
      },

      setActiveFinancialYear: (fy) => set({ activeFinancialYear: fy }),

      updateUser: (userData) => set((state) => ({ user: { ...state.user, ...userData } })),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        // If the access token expired and there is no refresh token, reset session.
        // If a refresh token is available, keep state intact so axios/watcher can refresh it.
        if (state && state.token && isTokenExpired(state.token) && !state.refreshToken) {
          Object.assign(state, EMPTY_SESSION);
        }
      },
    }
  )
);

export default useAuthStore;
