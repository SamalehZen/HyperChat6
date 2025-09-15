import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AiSettingsState = {
  reasoningEnabledDefault: boolean;
  reasoningBudgetDefault: number; // 0 - 10000
  setReasoningEnabledDefault: (enabled: boolean) => void;
  setReasoningBudgetDefault: (budget: number) => void;
};

export const useAiSettingsStore = create<AiSettingsState>()(
  persist(
    (set, get) => ({
      reasoningEnabledDefault: true,
      reasoningBudgetDefault: 8500,
      setReasoningEnabledDefault: (enabled: boolean) => set({ reasoningEnabledDefault: enabled }),
      setReasoningBudgetDefault: (budget: number) =>
        set({ reasoningBudgetDefault: Math.max(0, Math.min(10000, Math.floor(budget || 0))) }),
    }),
    {
      name: 'ai-settings',
      version: 1,
      partialize: (state) => ({
        reasoningEnabledDefault: state.reasoningEnabledDefault,
        reasoningBudgetDefault: state.reasoningBudgetDefault,
      }),
    }
  )
);
