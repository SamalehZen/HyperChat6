import { prisma } from '@repo/prisma';

export type UIPreferences = {
  backgroundVariant: string;
  aiPromptShinePreset: string;
  updatedAt?: string;
};

export const DEFAULT_UI_PREFERENCES: UIPreferences = {
  backgroundVariant: 'new',
  aiPromptShinePreset: 'palette2',
};

export async function getUIPreferences(): Promise<UIPreferences> {
  const existing = await (prisma as any).appSetting.findUnique({
    where: { key: 'ui.preferences' },
  });
  if (!existing) {
    return { ...DEFAULT_UI_PREFERENCES, updatedAt: new Date().toISOString() };
  }
  const value = existing.value || {};
  const backgroundVariant = value.backgroundVariant || DEFAULT_UI_PREFERENCES.backgroundVariant;
  const aiPromptShinePreset = value.aiPromptShinePreset || DEFAULT_UI_PREFERENCES.aiPromptShinePreset;
  return { backgroundVariant, aiPromptShinePreset, updatedAt: existing.updatedAt?.toISOString?.() || new Date().toISOString() };
}

export async function upsertUIPreferences(value: { backgroundVariant: string; aiPromptShinePreset: string; }) {
  const saved = await (prisma as any).appSetting.upsert({
    where: { key: 'ui.preferences' },
    update: { value },
    create: { key: 'ui.preferences', value },
  });
  return { backgroundVariant: value.backgroundVariant, aiPromptShinePreset: value.aiPromptShinePreset, updatedAt: saved.updatedAt?.toISOString?.() || new Date().toISOString() } as UIPreferences;
}
