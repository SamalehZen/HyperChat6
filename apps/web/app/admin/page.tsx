'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Dialog, DialogContent, useToast, Switch, Checkbox } from '@repo/ui';
import { ChatMode, getChatModeName } from '@repo/shared/config';

type UserRow = {
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

export default function AdminPage() {
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
      <h1 className="mb-4 text-2xl font-semibold">Administration</h1>
      <KPIHeader />
      <CreateUser onCreated={reload} />
      <OnlinePanel />
      <RecentEventsPanel />

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
            <option value="locked">Bloqué</option>
            <option value="deleted">Supprimé</option>
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
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {u.deletedAt ? (<span className="inline-flex items-center rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-600">Supprimé</span>) : (
                      <>
                        {u.isSuspended && (<span className="inline-flex items-center rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600">Suspendu</span>)}
                        {u.isLocked && (<span className="inline-flex items-center rounded bg-purple-500/10 px-2 py-0.5 text-xs text-purple-600">Bloqué</span>)}
                        {!u.isSuspended && !u.isLocked && (<span className="inline-flex items-center rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600">Actif</span>)}
                      </>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">{u.online ? 'Oui' : 'Non'}</td>
                <td className="px-3 py-2">{u.lastIp ?? '-'}</td>
                <td className="px-3 py-2">{[u.lastCity, u.lastRegion, u.lastCountry].filter(Boolean).join(', ') || '-'}</td>
                <td className="px-3 py-2">{u.lastSeen ? new Date(u.lastSeen).toLocaleString() : '-'}</td>
                <td className="px-3 py-2">
                  <RowActions user={u} onChanged={reload} onShowActivity={() => setSelectedUser(u)} onManageAccess={() => setAccessUser(u)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ActivityDialog user={selectedUser} onClose={() => setSelectedUser(null)} />
      <ManageAccessDialog user={accessUser} onClose={() => setAccessUser(null)} />
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
    <div className="flex gap-2">
      <Button size="xs" variant="secondary" onClick={onShowActivity} disabled={loading !== null}>Détails</Button>
      <Button size="xs" variant="secondary" onClick={onManageAccess} disabled={loading !== null}>Gérer l’accès aux modèles</Button>
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

function KPIHeader() {
  const [data, setData] = useState<any | null>(null);
  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/admin/metrics', { cache: 'no-store' });
      if (res.ok) setData(await res.json());
    };
    load();
  }, []);
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
      <KpiCard title="Utilisateurs en ligne (1 min)" value={data?.onlineCount ?? '-'} series={data?.series?.onlineCount ?? []} dates={data?.series?.dates ?? []} color="emerald" />
      <KpiCard title="Comptes suspendus" value={data?.suspendedCount ?? '-'} series={data?.series?.suspendedCount ?? []} dates={data?.series?.dates ?? []} color="amber" />
      <KpiCard title="Comptes supprimés" value={data?.deletedCount ?? '-'} series={data?.series?.deletedCount ?? []} dates={data?.series?.dates ?? []} color="red" />
      <KpiCard title="Réactivations après lockout (24h)" value={data?.reactivatedAfterLockoutCount ?? '-'} series={data?.series?.reactivatedAfterLockoutCount ?? []} dates={data?.series?.dates ?? []} color="sky" />
    </div>
  );
}

function KpiCard({ title, value, series, dates, color }: { title: string; value: number | string; series: number[]; dates: string[]; color: 'emerald' | 'amber' | 'red' | 'sky' }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="text-2xl font-semibold">{value}</div>
        <MiniSpark series={series} color={color} />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{dates?.[0]} → {dates?.[dates.length-1]}</div>
    </div>
  );
}

function MiniSpark({ series, color }: { series: number[]; color: 'emerald' | 'amber' | 'red' | 'sky' }) {
  const max = Math.max(1, ...series);
  const heights = series.map(v => Math.max(2, Math.round((v / max) * 24)));
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/70',
    amber: 'bg-amber-500/70',
    red: 'bg-red-500/70',
    sky: 'bg-sky-500/70',
  };
  return (
    <div className="flex h-16 w-28 items-end gap-1">
      {heights.map((h, i) => (
        <div key={i} className={`${colors[color]} w-2 rounded`} style={{ height: `${h}px` }} />
      ))}
    </div>
  );
}

function ManageAccessDialog({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
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
      // transitioning out of "all" when unchecking
      if (!checked) {
        setAllowed(allModes.filter(m => m !== mode));
      }
      return;
    }
    setAllowed(prev => {
      const curr = new Set(prev || []);
      if (checked) curr.add(mode); else curr.delete(mode);
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
        <h3 className="text-lg font-semibold mb-1">Gérer l’accès aux modèles</h3>
        <p className="text-sm text-muted-foreground mb-3">{user?.email}</p>

        <div className="mb-3 flex items-center justify-between rounded border p-2">
          <div>
            <div className="font-medium text-sm">Tout autoriser</div>
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

function RecentEventsPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [limit, setLimit] = useState(25);
  const [types, setTypes] = useState<string[]>([]);

  const load = async (currentLimit = limit, currentTypes = types) => {
    const params = new URLSearchParams();
    params.set('limit', String(currentLimit));
    if (currentTypes.length) params.set('types', currentTypes.join(','));
    const res = await fetch(`/api/admin/events/recent?${params.toString()}`, { cache: 'no-store' });
    if (res.ok) setItems((await res.json()).items);
  };

  useEffect(() => { load(); }, []);

  const toggleType = (t: string) => {
    setTypes(prev => {
      const next = prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t];
      load(limit, next);
      return next;
    });
  };

  const allTypes = ['login_failed','lockout','unlock','suspend','unsuspend','delete','account_created','account_updated'];

  return (
    <div className="mt-4 rounded-md border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Événements récents (24h)</h2>
        <div className="flex flex-wrap gap-2">
          {allTypes.map(t => (
            <label key={t} className={`text-xs ${types.includes(t) ? 'font-semibold' : ''}`}>
              <input type="checkbox" className="mr-1 align-middle" checked={types.includes(t)} onChange={() => toggleType(t)} />
              {t}
            </label>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Date</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
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
      <div className="mt-2 text-right">
        <Button size="sm" variant="secondary" onClick={() => { const nl = limit + 25; setLimit(nl); load(nl); }}>Charger plus</Button>
      </div>
    </div>
  );
}
