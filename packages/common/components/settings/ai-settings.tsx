"use client";
import { useAiSettingsStore } from '@repo/common/store';
import { Badge, Button, Input, Slider, Switch } from '@repo/ui';

export const AiSettings = () => {
  const enabled = useAiSettingsStore(s => s.reasoningEnabledDefault);
  const budget = useAiSettingsStore(s => s.reasoningBudgetDefault);
  const setEnabled = useAiSettingsStore(s => s.setReasoningEnabledDefault);
  const setBudget = useAiSettingsStore(s => s.setReasoningBudgetDefault);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <h2 className="text-base font-semibold">Raisonnement (Gemini 2.5)</h2>
        <p className="text-muted-foreground text-xs">
          Contrôlez l'activation et le budget de la pensée (runtime only). Ces valeurs s'appliquent par défaut à toutes les nouvelles conversations. Les overrides par conversation prennent le dessus.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-sm font-medium">Activer le raisonnement par défaut</p>
          <p className="text-muted-foreground text-xs">Activé par défaut</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled as any} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Budget de pensée par défaut</p>
          <Badge variant="secondary" className="rounded-full">{budget} tokens</Badge>
        </div>
        <Slider min={0} max={10000} step={100} value={[budget]} onValueChange={(v: number[]) => setBudget(v?.[0] || 0)} />
      </div>
    </div>
  );
};
