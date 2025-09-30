"use client";
import { useState } from 'react';
import { Button } from '@repo/ui';
import { SearchAutocomplete } from './_components/search-autocomplete';
import { UserAccessEditor } from './_components/user-access-editor';

export default function AdminAccessPage() {
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState<{ id: string; email: string } | null>(null);

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <h1 className="mb-6 text-3xl font-bold text-foreground">Accès aux modèles</h1>

      <div className="glass-panel rounded-lg p-6">
        <div className="mb-3">
          <label className="mb-2 block text-sm font-medium text-foreground">Rechercher un utilisateur (email)</label>
          <SearchAutocomplete value={email} onChange={setEmail} onSelect={(s) => setSelected(s)} />
        </div>
        <div className="text-xs text-muted-foreground">Ou gérez depuis la page « Utilisateurs ».</div>
      </div>

      {selected && (
        <div className="mt-6 glass-card rounded-lg p-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Sélectionné: <span className="font-semibold text-foreground">{selected.email}</span></div>
          <Button variant="secondary" size="sm" onClick={() => setSelected(null)} className="glow-hover-info">Changer d'utilisateur</Button>
        </div>
      )}

      {selected && (
        <div className="mt-6">
          <UserAccessEditor userId={selected.id} email={selected.email} />
        </div>
      )}
    </div>
  );
}