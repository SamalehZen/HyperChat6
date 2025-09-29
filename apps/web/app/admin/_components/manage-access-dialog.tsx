"use client";
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, Switch, Checkbox, useToast } from '@repo/ui';
import { ChatMode, getChatModeName } from '@repo/shared/config';

export type AdminUserRow = {
  id: string;
  email: string;
};

export function ManageAccessDialog({ user, onClose }: { user: AdminUserRow | null; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const [allModes, setAllModes] = useState<string[]>([]);
  const [allowed, setAllowed] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setOpen(true);
      (async () => {
        const res = await fetch(`/api/admin/users/${user.id}/chat-modes`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setAllModes(data.allModes || []);
          setAllowed(data.allowedChatModes ?? null);
        }
      })();
    }
  }, [user]);

  const isAll = allowed === null;
  const toggleAll = (checked: boolean) => {
    if (checked) {
      setAllowed(null);
    } else {
      setAllowed(allModes.slice());
    }
  };

  const toggleMode = (mode: string, checked: boolean) => {
    if (allowed === null) {
      if (!checked) {
        setAllowed(allModes.filter((m) => m !== mode));
      }
      return;
    }
    setAllowed((prev) => {
      const curr = new Set(prev || []);
      if (checked) curr.add(mode);
      else curr.delete(mode);
      return Array.from(curr);
    });
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const res = await fetch(`/api/admin/users/${user.id}/chat-modes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowedChatModes: allowed }),
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: 'Accès mis à jour' });
      setOpen(false);
      onClose();
    } else {
      toast({ title: 'Erreur lors de la mise à jour' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) onClose(); }}>
      <DialogContent ariaTitle={user ? `Gérer l’accès — ${user.email}` : 'Gérer l’accès'} className="max-w-lg">
        <h3 className="mb-1 text-lg font-semibold">Gérer l’accès aux modèles</h3>
        <p className="mb-3 text-sm text-muted-foreground">{user?.email}</p>

        <div className="mb-3 flex items-center justify-between rounded border p-2">
          <div>
            <div className="text-sm font-medium">Tout autoriser</div>
            <div className="text-xs text-muted-foreground">Par défaut, tous les modes sont autorisés</div>
          </div>
          <Switch checked={isAll} onCheckedChange={toggleAll} />
        </div>

        <div className="max-h-80 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-2">
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

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { setOpen(false); onClose(); }}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
