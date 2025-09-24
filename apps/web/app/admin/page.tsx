'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Dialog, DialogContent, useToast } from '@repo/ui';

type UserRow = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  isSuspended: boolean;
  isLocked: boolean;
  createdAt: string;
  lastSeen?: string | null;
  lastIp?: string | null;
  lastCountry?: string | null;
  lastRegion?: string | null;
  lastCity?: string | null;
  online?: boolean;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const reload = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  };

  useEffect(() => { reload(); }, [page, status]);

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Administration</h1>
      <CreateUser onCreated={reload} />
      <OnlinePanel />

      <div className="mt-6 flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="q" className="mb-1 block text-sm font-medium">Recherche (email)</label>
          <Input id="q" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…"/>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Statut</label>
          <select
            className="border-input bg-background text-foreground h-9 w-48 rounded-md border px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tous</option>
            <option value="online">En ligne</option>
            <option value="offline">Hors ligne</option>
            <option value="suspended">Suspendu</option>
          </select>
        </div>
        <Button onClick={() => { setPage(1); reload(); }}>Appliquer</Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Rôle</th>
              <th className="px-3 py-2 text-left font-medium">État</th>
              <th className="px-3 py-2 text-left font-medium">En ligne</th>
              <th className="px-3 py-2 text-left font-medium">IP</th>
              <th className="px-3 py-2 text-left font-medium">Géo</th>
              <th className="px-3 py-2 text-left font-medium">Dernière activité</th>
              <th className="px-3 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">{u.isLocked ? 'Verrouillé' : (u.isSuspended ? 'Suspendu' : 'Actif')}</td>
                <td className="px-3 py-2">{u.online ? 'Oui' : 'Non'}</td>
                <td className="px-3 py-2">{u.lastIp ?? '-'}</td>
                <td className="px-3 py-2">{[u.lastCity, u.lastRegion, u.lastCountry].filter(Boolean).join(', ') || '-'}</td>
                <td className="px-3 py-2">{u.lastSeen ? new Date(u.lastSeen).toLocaleString() : '-'}</td>
                <td className="px-3 py-2">
                  <RowActions user={u} onChanged={reload} onShowActivity={() => setSelectedUser(u)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ActivityDialog user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}

function CreateUser({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, role }) });
    setLoading(false);
    if (res.ok) { setEmail(''); setPassword(''); setRole('user'); onCreated(); }
  };
  return (
    <div className="border rounded-md p-4">
      <h2 className="mb-2 text-lg font-semibold">Créer un utilisateur</h2>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <Input id="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">Mot de passe</label>
          <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
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
        <Button type="submit" disabled={loading}>{loading ? 'Création…' : 'Créer'}</Button>
      </form>
    </div>
  );
}

function RowActions({ user, onChanged, onShowActivity }: { user: UserRow; onChanged: () => void; onShowActivity: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const doAction = async (action: string, payload?: any) => {
    setLoading(action);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: action === 'delete' ? 'DELETE' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: action === 'delete' ? undefined : JSON.stringify({ action, ...payload }) });
    setLoading(null);
    if (res.ok) onChanged();
  };

  return (
    <div className="flex gap-2">
      <Button size="xs" variant="secondary" onClick={onShowActivity} disabled={loading !== null}>Détails</Button>
      <Button size="xs" variant="secondary" onClick={() => {
        const p = prompt('Nouveau mot de passe');
        if (p) doAction('reset_password', { password: p });
      }} disabled={loading !== null}>Reset</Button>
      <Button size="xs" variant="secondary" onClick={() => doAction(user.isSuspended ? 'unsuspend' : 'suspend')} disabled={loading !== null}>{user.isSuspended ? 'Activer' : 'Suspendre'}</Button>
      {user.isLocked && (
        <Button size="xs" variant="secondary" onClick={async () => {
          setLoading('unlock');
          const res = await fetch(`/api/admin/users/${user.id}/unlock`, { method: 'POST' });
          setLoading(null);
          if (res.ok) {
            toast({ title: 'Compte réactivé' });
            onChanged();
          }
        }} disabled={loading !== null}>Réactiver</Button>
      )}
      <Button size="xs" variant="secondary" onClick={() => doAction('update_role', { role: user.role === 'admin' ? 'user' : 'admin' })} disabled={loading !== null}>Rôle: {user.role}</Button>
      <Button size="xs" variant="destructive" onClick={() => {
        const c1 = confirm(`Supprimer ${user.email} ?`);
        const c2 = c1 && confirm('Action irréversible — confirmer ?');
        if (c2) doAction('delete');
      }} disabled={loading !== null}>Supprimer</Button>
    </div>
  );
}

function ActivityDialog({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [order, setOrder] = useState<'asc'|'desc'>('desc');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setOpen(true);
      setPage(1);
      setOrder('desc');
    }
  }, [user]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      params.set('order', order);
      const res = await fetch(`/api/admin/users/${user.id}/activity?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
        setLimit(data.limit ?? 20);
      }
      setLoading(false);
    };
    if (open) load();
  }, [open, user?.id, page, order]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) onClose(); }}>
      <DialogContent ariaTitle={user ? `Historique d’activité — ${user.email}` : 'Historique d’activité'} className="max-w-3xl">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Historique d’activité</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Tri</label>
            <select
              className="border-input bg-background text-foreground h-9 w-40 rounded-md border px-2 text-sm"
              value={order}
              onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}
            >
              <option value="desc">Récent → Ancien</option>
              <option value="asc">Ancien → Récent</option>
            </select>
          </div>
        </div>
        <div className="mt-3 overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-left font-medium">IP</th>
                <th className="px-3 py-2 text-left font-medium">Géo</th>
                <th className="px-3 py-2 text-left font-medium">Détails</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-2">{new Date(it.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{it.action}</td>
                  <td className="px-3 py-2">{it.ip || '-'}</td>
                  <td className="px-3 py-2">{[it.city, it.region, it.country].filter(Boolean).join(', ') || '-'}</td>
                  <td className="px-3 py-2 max-w-[260px] truncate">{it.details ? JSON.stringify(it.details) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Page {page} / {totalPages} • {total} entrées</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</Button>
            <Button size="sm" variant="secondary" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Suivant</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OnlinePanel() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetch('/api/admin/online', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (!cancelled) setItems(data.items);
      }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <div className="mt-4 rounded-md border p-4">
      <h2 className="mb-2 text-lg font-semibold">Utilisateurs en ligne</h2>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">Aucun utilisateur en ligne</p> : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {items.map((u) => (
            <div key={u.userId} className="rounded border p-2">
              <div className="font-medium">{u.email}</div>
              <div className="text-xs text-muted-foreground">{[u.lastCity, u.lastRegion, u.lastCountry].filter(Boolean).join(', ') || '-'} • {u.lastIp || '-'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
