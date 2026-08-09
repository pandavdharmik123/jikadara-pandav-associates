import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isTokenExpired } from '../utils/tokenUtils';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      activeFinancialYear: null,

      login: (user, token) => set({ user, token, isAuthenticated: true }),
      
      logout: () => set({ user: null, token: null, isAuthenticated: false, activeFinancialYear: null }),
      
      setActiveFinancialYear: (fy) => set({ activeFinancialYear: fy }),
      
      updateUser: (userData) => set((state) => ({ user: { ...state.user, ...userData } })),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state && state.token && isTokenExpired(state.token)) {
          state.user = null;
          state.token = null;
          state.isAuthenticated = false;
          state.activeFinancialYear = null;
        }
      },
    }
  )
);

export default useAuthStore;
