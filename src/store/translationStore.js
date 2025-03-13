import { create } from 'zustand';

export const useTranslationStore = create((set) => ({
  sessionTranslations: [], // Starts as empty array, non-persistent. Used for session tracking—reset on reload
  addTranslation: (translation) => // Prepends new translation. Key for session history—consider a limit.
    set((state) => ({
      sessionTranslations: [translation, ...state.sessionTranslations],
    })),
  clearTranslations: () => set({ sessionTranslations: [] }), // Resets array. Useful for session reset—ensure UI updates.
}));