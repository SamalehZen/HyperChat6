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
      <h1 className="mb-4 text-2xl font-semibold">Accès aux modèles</h1>

      <div className="rounded-md border p-4">
        <div className="mb-2">
          <label className="mb-1 block text-sm font-medium">Rechercher un utilisateur (email)</label>
          <SearchAutocomplete value={email} onChange={setEmail} onSelect={(s) => setSelected(s)} />
        </div>
        <div className="text-xs text-muted-foreground">Ou gérez depuis la page « Utilisateurs ».</div>
      </div>

      {selected && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Sélectionné: <span className="font-medium text-foreground">{selected.email}</span></div>
          <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>Changer d’utilisateur</Button>
        </div>
      )}

      {selected && (
        <div className="mt-3">
          <UserAccessEditor userId={selected.id} email={selected.email} />
        </div>
      )}
    </div>
  );
}
