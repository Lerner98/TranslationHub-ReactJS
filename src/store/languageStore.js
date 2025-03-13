import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useLanguageStore = create(
  persist(
    (set) => ({
      defaultFromLang: localStorage.getItem('defaultFromLang') || '',
      defaultToLang: localStorage.getItem('defaultToLang') || '', // Initializes from `localStorage` with `''` fallback. Used by guests—should be integrated in components
      setDefaultFromLang: (lang) => {
        localStorage.setItem('defaultFromLang', lang);
        set({ defaultFromLang: lang });
      }, // Updates state and `localStorage`. Key for persistence—ensure no conflicts with `user` prefs.
      setDefaultToLang: (lang) => {
        localStorage.setItem('defaultToLang', lang);
        set({ defaultToLang: lang });
      },
    }),
    {  // Saves to `localStorage` under `language-preferences`. Essential for guest preference retention.
      name: 'language-preferences',
      storage: createJSONStorage(() => localStorage),
    }
  )
);