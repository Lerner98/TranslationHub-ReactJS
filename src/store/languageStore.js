/*
Language Store (Zustand) - Overview
This Zustand store manages language preferences for translations.
It ensures persistent storage of preferred languages for:

 Guests (Local Storage)
 Logged-in Users (Future Expansion)
 Cross-Session Retention (Persists settings even after page refresh)
 Optimized State Management (Uses Zustand for reactivity)
*/


import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';


/*
State Initialization (Default Languages)
Loads preferences from localStorage if available.
Defaults to an empty string ('') if no stored value exists.
These values apply only to guests (logged-in users have server-side settings).
*/
export const useLanguageStore = create(
  persist(
    (set) => ({
      defaultFromLang: localStorage.getItem('defaultFromLang') || '',
      defaultToLang: localStorage.getItem('defaultToLang') || '', 
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