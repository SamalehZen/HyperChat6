"use client";

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ShinePreset } from '@repo/shared/config';

export type BackgroundVariant = 'new' | 'old' | 'mesh' | 'shader' | 'neural';

type PreferencesState = {
  backgroundVariant: BackgroundVariant;
  aiPromptShinePreset: ShinePreset;
};

type PreferencesActions = {
  setBackgroundVariant: (v: BackgroundVariant) => void;
  setAiPromptShinePreset: (preset: ShinePreset) => void;
};

export const usePreferencesStore = create<PreferencesState & PreferencesActions>()(
  persist(
    immer((set) => ({
      backgroundVariant: 'new',
      aiPromptShinePreset: 'palette2',
      setBackgroundVariant: (v: BackgroundVariant) => {
        set((state) => {
          state.backgroundVariant = v;
        });
      },
      setAiPromptShinePreset: (preset: ShinePreset) => {
        set((state) => {
          state.aiPromptShinePreset = preset;
        });
      },
    })),
    {
      name: 'preferences-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
