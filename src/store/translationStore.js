/*
Translation Store (Zustand) - Overview
This Zustand store manages session-based translations for:

 Tracking translations within a single session
 Resetting translations when the session ends
 Live state updates without persistence
 Note: Unlike useLanguageStore, this store does not persist data in localStorage.
 Session-only state: Translations reset when the page reloads.
*/



/*
 Zustand Store Setup
create (from Zustand): Defines state & actions.
State remains in memory (does not persist across reloads).
Designed for tracking translations in a session.
*/
import { create } from 'zustand';

export const useTranslationStore = create((set) => ({
  sessionTranslations: [], // Starts as empty array, non-persistent. Used for session tracking—reset on reload
  addTranslation: (translation) => // Prepends new translation. Key for session history—consider a limit.
    set((state) => ({
      sessionTranslations: [translation, ...state.sessionTranslations],
    })),
  clearTranslations: () => set({ sessionTranslations: [] }), // Resets array. Useful for session reset—ensure UI updates.
}));






/*
Notes for functions:

addTranslation Function (Prepend to List)
Adds new translations to the beginning of the array.
Ensures the latest translations appear first.
Maintains session history dynamically.
Potential Improvement: Add a limit (e.g., store only the last 20 translations).


clearTranslations Function (Reset Translations)
Empties the sessionTranslations array.
Useful when logging out or resetting the session.
 Ensure UI updates properly when called.

*/