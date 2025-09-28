"use client";
import { create } from 'zustand';
import type { BackgroundVariant } from './preferences.store';
import type { ShinePreset } from '@repo/shared/config';

export type GlobalPreferences = {
  backgroundVariant: BackgroundVariant;
  aiPromptShinePreset: ShinePreset;
  updatedAt?: string;
};

type GlobalPreferencesState = {
  loaded: boolean;
  prefs?: GlobalPreferences;
};

type GlobalPreferencesActions = {
  setFromServer: (prefs: GlobalPreferences) => void;
};

export const useGlobalPreferencesStore = create<GlobalPreferencesState & GlobalPreferencesActions>((set, get) => ({
  loaded: false,
  prefs: undefined,
  setFromServer: (incoming) => {
    const state = get();
    const currentUpdatedAt = state.prefs?.updatedAt ? new Date(state.prefs.updatedAt).getTime() : 0;
    const incomingUpdatedAt = incoming.updatedAt ? new Date(incoming.updatedAt).getTime() : Date.now();
    if (currentUpdatedAt && incomingUpdatedAt < currentUpdatedAt) {
      set({ loaded: true });
      return;
    }
    set({ loaded: true, prefs: { backgroundVariant: incoming.backgroundVariant, aiPromptShinePreset: incoming.aiPromptShinePreset, updatedAt: incoming.updatedAt } });
  },
}));
