import { create } from 'zustand';

export const useTranslationStore = create((set) => ({
  sessionTranslations: [],
  addTranslation: (translation) =>
    set((state) => ({
      sessionTranslations: [translation, ...state.sessionTranslations],
    })),
  clearTranslations: () => set({ sessionTranslations: [] }),
}));