import { prisma } from '@repo/prisma';

import { ChatMode } from '@repo/shared/config';

export type UIPreferences = {
  backgroundVariant: string;
  aiPromptShinePreset: string;
  allowedChatModes?: ChatMode[];
  updatedAt?: string;
};

export const DEFAULT_UI_PREFERENCES: UIPreferences = {
  backgroundVariant: 'new',
  aiPromptShinePreset: 'palette2',
  allowedChatModes: undefined,
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
  const allowedChatModes = Array.isArray(value.allowedChatModes) ? value.allowedChatModes : DEFAULT_UI_PREFERENCES.allowedChatModes;
  return { backgroundVariant, aiPromptShinePreset, allowedChatModes, updatedAt: existing.updatedAt?.toISOString?.() || new Date().toISOString() };
}

export async function upsertUIPreferences(partial: Partial<{ backgroundVariant: string; aiPromptShinePreset: string; allowedChatModes: ChatMode[] }>) {
  const existing = await (prisma as any).appSetting.findUnique({ where: { key: 'ui.preferences' } });
  const current = existing?.value || {};
  const next = { ...current, ...partial };
  const saved = await (prisma as any).appSetting.upsert({
    where: { key: 'ui.preferences' },
    update: { value: next },
    create: { key: 'ui.preferences', value: next },
  });
  return {
    backgroundVariant: next.backgroundVariant || DEFAULT_UI_PREFERENCES.backgroundVariant,
    aiPromptShinePreset: next.aiPromptShinePreset || DEFAULT_UI_PREFERENCES.aiPromptShinePreset,
    allowedChatModes: next.allowedChatModes,
    updatedAt: saved.updatedAt?.toISOString?.() || new Date().toISOString(),
  } as UIPreferences;
}
