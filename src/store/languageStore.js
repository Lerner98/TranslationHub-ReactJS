import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useLanguageStore = create(
  persist(
    (set) => ({
      defaultFromLang: localStorage.getItem('defaultFromLang') || '',
      defaultToLang: localStorage.getItem('defaultToLang') || '',
      setDefaultFromLang: (lang) => {
        localStorage.setItem('defaultFromLang', lang);
        set({ defaultFromLang: lang });
      },
      setDefaultToLang: (lang) => {
        localStorage.setItem('defaultToLang', lang);
        set({ defaultToLang: lang });
      },
    }),
    {
      name: 'language-preferences',
      storage: createJSONStorage(() => localStorage),
    }
  )
);