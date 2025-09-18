"use client";

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type BackgroundVariant = 'new' | 'old' | 'hero';

type PreferencesState = {
  backgroundVariant: BackgroundVariant;
};

type PreferencesActions = {
  setBackgroundVariant: (v: BackgroundVariant) => void;
};

export const usePreferencesStore = create<PreferencesState & PreferencesActions>()(
  persist(
    immer((set) => ({
      backgroundVariant: 'hero',
      setBackgroundVariant: (v: BackgroundVariant) => {
        set((state) => {
          state.backgroundVariant = v;
        });
      },
    })),
    {
      name: 'preferences-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
