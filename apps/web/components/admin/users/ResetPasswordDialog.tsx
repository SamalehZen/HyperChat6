"use client";

import { useState, useEffect } from 'react';
import { Button, Dialog, DialogContent, Input } from '@repo/ui';

export function ResetPasswordDialog({ open, onOpenChange, onSubmit, email }: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (password: string) => Promise<void> | void; email?: string; }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword('');
      setConfirm('');
      setSaving(false);
    }
  }, [open]);

  const valid = password.length >= 6 && password === confirm;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onSubmit(password);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ariaTitle={`Réinitialiser le mot de passe${email ? ` — ${email}` : ''}`} className="max-w-md">
        <div>
          <h3 className="text-lg font-semibold mb-1">Réinitialiser le mot de passe</h3>
          {email && <p className="text-sm text-muted-foreground mb-3">{email}</p>}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Nouveau mot de passe</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Confirmer le mot de passe</label>
              <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!valid || saving}>{saving ? 'Enregistrement…' : 'Réinitialiser'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
