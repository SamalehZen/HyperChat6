"use client";
import { useGlobalPreferencesStore, usePreferencesStore } from '@repo/common/store';

export function useEffectivePreferences() {
  const globalLoaded = useGlobalPreferencesStore(s => s.loaded);
  const globalPrefs = useGlobalPreferencesStore(s => s.prefs);
  const localBackground = usePreferencesStore(s => s.backgroundVariant);
  const localShine = usePreferencesStore(s => s.aiPromptShinePreset);

  if (globalLoaded && globalPrefs) {
    return { backgroundVariant: globalPrefs.backgroundVariant, aiPromptShinePreset: globalPrefs.aiPromptShinePreset, updatedAt: globalPrefs.updatedAt } as const;
  }
  return { backgroundVariant: localBackground, aiPromptShinePreset: localShine } as const;
}
