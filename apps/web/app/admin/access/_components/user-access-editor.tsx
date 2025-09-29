"use client";
import { useEffect, useState } from 'react';
import { Button, Checkbox, Switch, useToast } from '@repo/ui';
import { ChatMode, getChatModeName } from '@repo/shared/config';

export function UserAccessEditor({ userId, email }: { userId: string; email: string }) {
  const [loading, setLoading] = useState(true);
  const [allModes, setAllModes] = useState<string[]>([]);
  const [allowed, setAllowed] = useState<string[] | null>(null);
  const [initialAllowed, setInitialAllowed] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/users/${userId}/chat-modes`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAllModes(data.allModes || []);
        setAllowed(data.allowedChatModes ?? null);
        setInitialAllowed(data.allowedChatModes ?? null);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  const isAll = allowed === null;
  const toggleAll = (checked: boolean) => {
    setAllowed(checked ? null : allModes.slice());
  };

  const toggleMode = (mode: string, checked: boolean) => {
    if (allowed === null) {
      if (!checked) setAllowed(allModes.filter((m) => m !== mode));
      return;
    }
    setAllowed((prev) => {
      const set = new Set(prev || []);
      if (checked) set.add(mode); else set.delete(mode);
      return Array.from(set);
    });
  };

  const changed = JSON.stringify(allowed) !== JSON.stringify(initialAllowed);

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/users/${userId}/chat-modes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowedChatModes: allowed }),
    });
    setSaving(false);
    if (res.ok) {
      setInitialAllowed(allowed);
      toast({ title: 'Accès mis à jour' });
    } else {
      toast({ title: 'Erreur lors de la mise à jour' });
    }
  };

  const cancel = () => {
    setAllowed(initialAllowed);
  };

  if (loading) return (
    <div className="rounded-md border p-4">
      <div className="mb-1 h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-2 grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-6 w-48 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="rounded-md border p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{email}</div>
          <div className="text-xs text-muted-foreground">Gestion des accès aux modèles</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Tout autoriser</span>
          <Switch checked={isAll} onCheckedChange={toggleAll} />
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {allModes.map((m) => {
            const checked = allowed === null ? true : (allowed || []).includes(m);
            return (
              <label key={m} className="flex items-center gap-2 text-sm">
                <Checkbox checked={checked} onCheckedChange={(c: any) => toggleMode(m, Boolean(c))} />
                <span>{getChatModeName(m as ChatMode)}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={cancel} disabled={!changed}>Annuler</Button>
        <Button onClick={save} disabled={!changed || saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </div>
    </div>
  );
}
