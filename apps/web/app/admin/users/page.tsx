"use client";
import { useEffect, useState } from 'react';
import { Button, Input, Dialog, DialogContent, useToast, Switch, Checkbox, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@repo/ui';
import { ManageAccessDialog, AdminUserRow } from '../_components/manage-access-dialog';
import { IconSettings2, IconShieldCheck, IconMarkdown, IconKey, IconTrash, IconUser } from '@repo/common/components';
import { TopUsersTokensCost } from '../_components/top-users-tokens-cost';

export type UserRow = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  isSuspended: boolean;
  isLocked?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  lastSeen?: string | null;
  lastIp?: string | null;
  lastCountry?: string | null;
  lastRegion?: string | null;
  lastCity?: string | null;
  online?: boolean;
};

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [accessUser, setAccessUser] = useState<UserRow | null>(null);

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
      <h1 className="mb-6 text-3xl font-bold text-foreground">Utilisateurs</h1>

      <TopUsersPanel />

      <CreateUser onCreated={reload} />

      <div className="mt-6 glass-panel rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Recherche & Filtres</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="q" className="mb-2 block text-sm font-medium text-foreground">Recherche (identifiant ou email)</label>
            <Input id="q" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…" className="glass-card-secondary"/>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Statut</label>
            <select
              className="glass-card-secondary border-border/40 text-foreground h-10 w-48 rounded-md border px-3 text-sm font-medium transition-all duration-200 hover:bg-white/60 dark:hover:bg-black/30"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tous</option>
              <option value="online">En ligne</option>
              <option value="offline">Hors ligne</option>
              <option value="suspended">Suspendu</option>
              <option value="locked">Bloqué</option>
              <option value="deleted">Supprimé</option>
            </select>
          </div>
          <Button onClick={() => { setPage(1); reload(); }} className="glow-hover-info">Appliquer</Button>
        </div>
      </div>

      <div className="mt-6 glass-card overflow-hidden rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="glass-card-secondary border-b border-border/40">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Identifiant</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Rôle</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">État</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground hidden lg:table-cell">En ligne</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground hidden lg:table-cell">IP</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground hidden lg:table-cell">Géo</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground hidden lg:table-cell">Dernière activité</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground w-0 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => (
              <tr key={u.id} className={`border-t border-border/30 transition-colors duration-200 ${idx % 2 === 0 ? 'bg-white/20 dark:bg-black/10' : 'bg-transparent'} hover:bg-white/40 dark:hover:bg-black/20`}>
                <td className="px-4 py-3 max-w-[220px] truncate font-medium text-foreground">{u.email}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-600' : 'bg-sky-500/10 text-sky-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {u.deletedAt ? (<span className="inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold bg-red-500/10 text-red-600 status-glow-error">Supprimé</span>) : (
                      <>
                        {u.isSuspended && (<span className="inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold bg-amber-500/10 text-amber-600 status-glow-warn">Suspendu</span>)}
                        {u.isLocked && (<span className="inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold bg-purple-500/10 text-purple-600">Bloqué</span>)}
                        {!u.isSuspended && !u.isLocked && (<span className="inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-600 status-glow-ok">Actif</span>)}
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell font-medium">
                  {u.online ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 status-glow-pulse status-glow-ok" />
                      Oui
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Non</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell font-medium text-muted-foreground">{u.lastIp ?? '-'}</td>
                <td className="px-4 py-3 hidden lg:table-cell font-medium text-muted-foreground">{[u.lastCity, u.lastRegion, u.lastCountry].filter(Boolean).join(', ') || '-'}</td>
                <td className="px-4 py-3 hidden lg:table-cell font-medium text-muted-foreground">{u.lastSeen ? new Date(u.lastSeen).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                <td className="px-4 py-3 text-right w-0 whitespace-nowrap">
                  <RowActions user={u} onChanged={reload} onShowActivity={() => setSelectedUser(u)} onManageAccess={() => setAccessUser(u)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ActivityDialog user={selectedUser} onClose={() => setSelectedUser(null)} />
      <ManageAccessDialog user={accessUser as AdminUserRow | null} onClose={() => setAccessUser(null)} />
    </div>
  );
}

function TopUsersPanel() {
  return (
    <TopUsersTokensCost windowSel={'7j'} limit={5} />
  );
}

function CreateUser({ onCreated }: { onCreated: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, role }) });
    setLoading(false);
    if (res.ok) {
      setUsername(''); setPassword(''); setRole('user');
      toast({ title: 'Utilisateur créé' });
      onCreated();
    } else {
      let msg = 'Échec de création';
      try { const d = await res.json(); if (d?.error) msg = d.error; } catch {}
      toast({ title: msg });
    }
  };

  return (
    <div className="mt-6 glass-panel rounded-lg p-6">
      <h2 className="mb-4 text-xl font-bold text-foreground">Créer un utilisateur</h2>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="username" className="mb-2 block text-sm font-medium text-foreground">Nom d'utilisateur</label>
          <Input id="username" value={username} onChange={e => setUsername(e.target.value)} required className="glass-card-secondary" />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">Mot de passe</label>
          <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="glass-card-secondary" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Rôle</label>
          <select
            className="glass-card-secondary border-border/40 text-foreground h-10 w-40 rounded-md border px-3 text-sm font-medium transition-all duration-200 hover:bg-white/60 dark:hover:bg-black/30"
            value={role}
            onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <Button type="submit" disabled={loading} className="glow-hover-success">{loading ? 'Création…' : 'Créer'}</Button>
      </form>
    </div>
  );
}

function RowActions({ user, onChanged, onShowActivity, onManageAccess }: { user: UserRow; onChanged: () => void; onShowActivity: () => void; onManageAccess: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const doAction = async (action: string, payload?: any) => {
    setLoading(action);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: action === 'delete' ? 'DELETE' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: action === 'delete' ? undefined : JSON.stringify({ action, ...payload }) });
    setLoading(null);
    if (res.ok) onChanged();
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <div className="hidden md:flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onShowActivity}
          tooltip="Détails"
          aria-label="Détails"
          disabled={loading !== null}
        >
          <IconMarkdown size={16} strokeWidth={2} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onManageAccess}
          tooltip="Accès aux modèles"
          aria-label="Accès aux modèles"
          disabled={loading !== null}
        >
          <IconShieldCheck size={16} strokeWidth={2} />
        </Button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon-sm" aria-label="Plus d'actions">
            <IconSettings2 size={16} strokeWidth={2} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onShowActivity}>Détails</DropdownMenuItem>
          <DropdownMenuItem onClick={onManageAccess}>Gérer l'accès aux modèles</DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            const p = prompt('Nouveau mot de passe');
            if (p) doAction('reset_password', { password: p });
          }}>Réinitialiser le mot de passe</DropdownMenuItem>
          <DropdownMenuItem onClick={() => doAction(user.isSuspended ? 'unsuspend' : 'suspend')}>{user.isSuspended ? 'Activer le compte' : 'Suspendre le compte'}</DropdownMenuItem>
          {user.isLocked && (
            <DropdownMenuItem onClick={async () => {
              setLoading('unlock');
              const res = await fetch(`/api/admin/users/${user.id}/unlock`, { method: 'POST' });
              setLoading(null);
              if (res.ok) { toast({ title: 'Compte réactivé' }); onChanged(); }
            }}>Réactiver (débloquer)</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => doAction('update_role', { role: user.role === 'admin' ? 'user' : 'admin' })}>Basculer rôle → {user.role === 'admin' ? 'user' : 'admin'}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            const c1 = confirm(`Supprimer ${user.email} ?`);
            const c2 = c1 && confirm('Action irréversible — confirmer ?');
            if (c2) doAction('delete');
          }} className="text-red-600 focus:text-red-600">Supprimer</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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

  const getEventBadge = (action: string) => {
    const badges: Record<string, string> = {
      'login_failed': 'bg-red-500/10 text-red-600',
      'lockout': 'bg-amber-500/10 text-amber-600',
      'unlock': 'bg-emerald-500/10 text-emerald-600',
      'suspend': 'bg-amber-500/10 text-amber-600',
      'unsuspend': 'bg-emerald-500/10 text-emerald-600',
      'delete': 'bg-red-500/10 text-red-600',
      'account_created': 'bg-sky-500/10 text-sky-600',
      'account_updated': 'bg-sky-500/10 text-sky-600',
    };
    return badges[action] || 'bg-muted text-muted-foreground';
  };

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
      <DialogContent ariaTitle={user ? `Historique d'activité — ${user.email}` : 'Historique d'activité'} className="max-w-3xl glass-panel">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-foreground">Historique d'activité</h3>
            <p className="text-sm font-medium text-muted-foreground mt-1">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">Tri</label>
            <select
              className="glass-card-secondary border-border/40 text-foreground h-9 w-40 rounded-md border px-3 text-sm font-medium"
              value={order}
              onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}
            >
              <option value="desc">Récent → Ancien</option>
              <option value="asc">Ancien → Récent</option>
            </select>
          </div>
        </div>
        <div className="mt-4 glass-card overflow-hidden rounded-lg shadow-sm">
          <table className="w-full text-sm">
            <thead className="glass-card-secondary border-b border-border/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">IP</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Géo</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Détails</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.id} className={`border-t border-border/30 transition-colors duration-200 ${idx % 2 === 0 ? 'bg-white/20 dark:bg-black/10' : 'bg-transparent'} hover:bg-white/40 dark:hover:bg-black/20`}>
                  <td className="px-4 py-3 font-medium text-foreground">{new Date(it.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${getEventBadge(it.action)}`}>
                      {it.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-muted-foreground">{it.ip || '-'}</td>
                  <td className="px-4 py-3 font-medium text-muted-foreground">{[it.city, it.region, it.country].filter(Boolean).join(', ') || '-'}</td>
                  <td className="max-w-[260px] truncate px-4 py-3 text-xs text-muted-foreground">{it.details ? JSON.stringify(it.details) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground">Page {page} / {totalPages} • {total} entrées</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</Button>
            <Button size="sm" variant="secondary" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Suivant</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}