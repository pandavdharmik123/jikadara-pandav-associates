import { create } from 'zustand';

const usePrivacyStore = create((set, get) => ({
  isRevealed: false,
  autoHideTimer: null,

  reveal: (autoHideMinutes = 5) => {
    const prevTimer = get().autoHideTimer;
    if (prevTimer) clearTimeout(prevTimer);

    let newTimer = null;
    if (autoHideMinutes > 0) {
      newTimer = setTimeout(() => {
        set({ isRevealed: false, autoHideTimer: null });
      }, autoHideMinutes * 60 * 1000);
    }

    set({ isRevealed: true, autoHideTimer: newTimer });
  },

  hide: () => {
    const prevTimer = get().autoHideTimer;
    if (prevTimer) clearTimeout(prevTimer);
    set({ isRevealed: false, autoHideTimer: null });
  },

  toggle: () => {
    const current = get().isRevealed;
    if (current) {
      get().hide();
    } else {
      get().reveal();
    }
  },
}));

export default usePrivacyStore;
