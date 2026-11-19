import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isTokenExpired } from '../lib/tokenUtils';
import { revokeSession } from '../lib/authClient';

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

      updateSession: ({ user, token, refreshToken }) =>
        set((state) => ({
          user: user || state.user,
          token,
          refreshToken: refreshToken ?? state.refreshToken,
          isAuthenticated: true,
        })),

      clearSession: () => set({ ...EMPTY_SESSION }),

      // The Advocate Management screens are shared with the website and read
      // the active financial year from the store, so keep that contract here.
      setActiveFinancialYear: (fy) => set({ activeFinancialYear: fy }),

      logout: () => {
        const { refreshToken, token } = get();
        // Revoke the family and blacklist the access token in the background.
        revokeSession({ refreshToken, token });
        set({ ...EMPTY_SESSION });
      },
    }),
    {
      name: 'jp-ie-auth-v1',
      onRehydrateStorage: () => (state) => {
        if (state && state.token && isTokenExpired(state.token) && !state.refreshToken) {
          Object.assign(state, EMPTY_SESSION);
        }
      },
    }
  )
);

export default useAuthStore;
