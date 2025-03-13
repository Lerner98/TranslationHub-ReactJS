import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set) => ({
      isDarkMode: false,  // Defaults to `false` (light mode). Rehydrates from `localStorage`—check UI integration.
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })), // Toggles `isDarkMode` and persists
    }),
    {
      name: 'theme-storage', // Saves to `localStorage` under `theme-storage`
    }
  )
);