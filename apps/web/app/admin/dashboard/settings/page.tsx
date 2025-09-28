"use client";

import { Button, Input, Switch, Select } from '@repo/ui';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Paramètres</h1>
      <div className="rounded-md border p-4">
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Hôte PostHog</label>
          <Input placeholder="https://us.i.posthog.com" disabled />
          <p className="text-xs text-muted-foreground mt-1">Lecture seule (placeholder)</p>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Capture d’événements</label>
          <div className="flex items-center gap-2">
            <Switch checked={true} disabled />
            <span className="text-sm">Activé</span>
          </div>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Thème</label>
          <Select className="w-48" disabled>
            <option>Clair</option>
            <option>Sombre</option>
            <option>Système</option>
          </Select>
        </div>
        <Button disabled>Enregistrer</Button>
      </div>
    </div>
  );
}
