import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Remembers which financial year the user last selected. The actual range is
 * always re-read from the backend so a deleted or edited FY cannot go stale.
 */
const usePreferencesStore = create(
  persist(
    (set) => ({
      selectedFyId: null,
      setSelectedFyId: (selectedFyId) => set({ selectedFyId }),
    }),
    { name: 'jp-ie-preferences-v1' }
  )
);

export default usePreferencesStore;
