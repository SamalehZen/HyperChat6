"use client";
import { useState } from 'react';
import { Button, Input } from '@repo/ui';
import { ManageAccessDialog, AdminUserRow } from '../_components/manage-access-dialog';

export default function AdminAccessPage() {
  const [email, setEmail] = useState('');
  const [foundUser, setFoundUser] = useState<AdminUserRow | null>(null);

  const search = async () => {
    const params = new URLSearchParams();
    params.set('q', email);
    params.set('page', '1');
    params.set('limit', '1');
    const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setFoundUser(data.items?.[0] ? { id: data.items[0].id, email: data.items[0].email } : null);
      if (!data.items?.[0]) alert('Aucun utilisateur trouvé');
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Accès aux modèles</h1>
      <div className="rounded-md border p-4">
        <div className="mb-3">
          <label htmlFor="email" className="mb-1 block text-sm font-medium">Rechercher un utilisateur (email)</label>
          <div className="flex items-end gap-2">
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ex: jean.dupont@example.com" />
            <Button onClick={search}>Rechercher</Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Ou bien, vous pouvez gérer depuis la page « Utilisateurs ».</p>
      </div>

      <ManageAccessDialog user={foundUser} onClose={() => setFoundUser(null)} />
    </div>
  );
}
