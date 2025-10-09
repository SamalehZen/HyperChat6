"use client";

import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, Input, useToast } from '@repo/ui';

export function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setEmail(''); setPassword(''); setRole('user'); setSaving(false);
    }
  }, [open]);

  const canSubmit = email.length > 3 && password.length >= 6;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      if (!res.ok) {
        let msg = '';
        try { const data = await res.json(); msg = data?.error || ''; } catch {}
        toast({ title: 'Erreur de création', description: msg || res.statusText });
        return;
      }
      toast({ title: 'Utilisateur créé', description: email });
      window.dispatchEvent(new CustomEvent('admin/users/created'));
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ariaTitle="Créer un utilisateur" className="max-w-md">
        <h3 className="text-lg font-semibold mb-2">Créer un utilisateur</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@domaine.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mot de passe</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Rôle</label>
            <select
              className="border-input bg-background text-foreground h-9 w-40 rounded-md border px-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={!canSubmit || saving}>{saving ? 'Création…' : 'Créer'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
