"use client";

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ShinePreset } from '@repo/shared/config';

export type BackgroundVariant = 'new' | 'old' | 'mesh' | 'shader' | 'neural' | 'redlines' | 'shaderlines' | 'unicorn';

type PreferencesState = {
  backgroundVariant: BackgroundVariant;
  aiPromptShinePreset: ShinePreset;
  unicornProjectId: string;
};

type PreferencesActions = {
  setBackgroundVariant: (v: BackgroundVariant) => void;
  setAiPromptShinePreset: (preset: ShinePreset) => void;
  setUnicornProjectId: (id: string) => void;
};

export const usePreferencesStore = create<PreferencesState & PreferencesActions>()(
  persist(
    immer((set) => ({
      backgroundVariant: 'new',
      aiPromptShinePreset: 'palette2',
      unicornProjectId: '4gZ4it90JCXyP8TH783D',
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
      setUnicornProjectId: (id: string) => {
        set((state) => {
          state.unicornProjectId = id;
        });
      },
    })),
    {
      name: 'preferences-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
