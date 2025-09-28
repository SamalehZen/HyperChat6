'use client';
import { useState } from 'react';
import { Button, Input, Switch } from '@repo/ui';

export default function SettingsPage() {
  const [features, setFeatures] = useState({
    allowSignup: true,
    enableLogs: true,
    maintenanceMode: false,
  });
  const [modelDefault, setModelDefault] = useState('gpt-4o-mini');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Paramètres</h1>

      <section className="rounded-md border p-4">
        <h2 className="mb-3 text-base font-medium">Général</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Inscription ouverte</span>
              <span className="text-xs text-muted-foreground">Permet aux nouveaux utilisateurs de créer un compte</span>
            </div>
            <Switch checked={features.allowSignup} onCheckedChange={(v) => setFeatures(f => ({ ...f, allowSignup: v }))} />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Journalisation</span>
              <span className="text-xs text-muted-foreground">Active les logs d'activité</span>
            </div>
            <Switch checked={features.enableLogs} onCheckedChange={(v) => setFeatures(f => ({ ...f, enableLogs: v }))} />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Mode maintenance</span>
              <span className="text-xs text-muted-foreground">Affiche une page de maintenance</span>
            </div>
            <Switch checked={features.maintenanceMode} onCheckedChange={(v) => setFeatures(f => ({ ...f, maintenanceMode: v }))} />
          </div>
        </div>
      </section>

      <section className="rounded-md border p-4">
        <h2 className="mb-3 text-base font-medium">Modèles</h2>
        <div className="flex flex-col gap-2 sm:max-w-md">
          <label className="text-sm font-medium">Modèle par défaut</label>
          <select
            className="rounded-md border bg-background px-2 py-1"
            value={modelDefault}
            onChange={(e) => setModelDefault(e.target.value)}
          >
            <option value="gpt-4o-mini">gpt-4o-mini</option>
            <option value="gemini-1.5-pro">gemini-1.5-pro</option>
            <option value="claude-3.5-sonnet">claude-3.5-sonnet</option>
          </select>
          <p className="text-xs text-muted-foreground">Ces réglages sont des placeholders et ne sont pas persistés.</p>
        </div>
      </section>

      <div className="flex items-center gap-2">
        <Button disabled>Enregistrer (placeholder)</Button>
        <Button variant="secondary">Réinitialiser</Button>
      </div>
    </div>
  );
}
