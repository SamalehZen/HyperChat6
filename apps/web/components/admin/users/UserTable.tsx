"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Skeleton, Checkbox, Switch, useToast } from '@repo/ui';

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

export function UserTable({ pageSize = 20, renderActions }: { pageSize?: number; renderActions?: (row: UserRow, helpers: { reload: () => void }) => React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [sortKey, setSortKey] = useState<null | 'email' | 'role' | 'etat' | 'online' | 'lastSeen'>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [selected, setSelected] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [rowLoading, setRowLoading] = useState<Record<string, string | null>>({});
  const { toast } = useToast();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const columnsCount = 1 /* select */ + 7 /* base */ + (renderActions ? 1 : 0);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (sortKey) {
      params.set('sortKey', sortKey);
      params.set('sortOrder', sortOrder);
    }
    const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } else {
      toast({ title: 'Erreur de chargement', description: res.statusText });
    }
    setLoading(false);
    setSelected([]);
  }, [page, pageSize, q, status, sortKey, sortOrder, toast]);

  useEffect(() => { load(); }, [page, status, sortKey, sortOrder, load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('admin/users/created', handler);
    return () => window.removeEventListener('admin/users/created', handler);
  }, [load]);

  const onApplyFilters = () => {
    setPage(1);
    load();
  };

  const computeEtat = (u: UserRow) => {
    if (u.deletedAt) return 'Supprimé';
    if (u.isSuspended) return 'Suspendu';
    if (u.isLocked) return 'Bloqué';
    return 'Actif';
  };

  const geoOf = (u: UserRow) => [u.lastCity, u.lastRegion, u.lastCountry].filter(Boolean).join(', ') || '-';

  const toggleSort = (key: NonNullable<typeof sortKey>) => {
    if (sortKey === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const pageAllSelected = useMemo(() => items.length > 0 && items.every(i => selected.includes(i.id)), [items, selected]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (checked) s.add(id); else s.delete(id);
      return Array.from(s);
    });
  };

  const toggleSelectAllOnPage = (checked: boolean) => {
    if (checked) setSelected(prev => Array.from(new Set([...prev, ...items.map(i => i.id)])));
    else setSelected(prev => prev.filter(id => !items.some(i => i.id === id)));
  };

  const patchAction = async (userId: string, action: string, payload?: any, labels?: { success?: string; error?: string }) => {
    setRowLoading(prev => ({ ...prev, [userId]: action }));
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'delete' ? undefined : JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) {
        let msg = '';
        try { const data = await res.json(); msg = data?.error || ''; } catch {}
        toast({ title: labels?.error || 'Erreur', description: msg || res.statusText });
        return false;
      }
      toast({ title: labels?.success || 'Action effectuée' });
      return true;
    } finally {
      setRowLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const updateRoleInline = async (u: UserRow, role: 'admin' | 'user') => {
    const ok = await patchAction(u.id, 'update_role', { role }, { success: `Rôle mis à jour (${role}) — ${u.email}` });
    if (ok) setItems(prev => prev.map(x => x.id === u.id ? { ...x, role } : x));
  };

  const toggleSuspendInline = async (u: UserRow, nextChecked: boolean) => {
    if (u.deletedAt || u.isLocked) return;
    const action = nextChecked ? 'suspend' : 'unsuspend';
    const ok = await patchAction(u.id, action, undefined, { success: nextChecked ? `Compte suspendu — ${u.email}` : `Compte activé — ${u.email}` });
    if (ok) setItems(prev => prev.map(x => x.id === u.id ? { ...x, isSuspended: nextChecked } : x));
  };

  const bulkRun = async (ids: string[], runner: (id: string) => Promise<boolean>) => {
    setBulkLoading(true);
    let success = 0; let failed = 0;
    for (const id of ids) {
      const ok = await runner(id);
      if (ok) success++; else failed++;
    }
    toast({ title: `Terminé: ${success} ok, ${failed} échec(s)` });
    setBulkLoading(false);
    await load();
  };

  const bulkSuspend = (suspend: boolean) => bulkRun(selected, (id) => patchAction(id, suspend ? 'suspend' : 'unsuspend'));
  const bulkRole = (role: 'admin' | 'user') => bulkRun(selected, (id) => patchAction(id, 'update_role', { role }));
  const bulkDelete = () => bulkRun(selected, (id) => patchAction(id, 'delete'));

  const exportCsv = async () => {
    toast({ title: 'Export en cours…' });
    const rows: UserRow[] = [];
    const paramsBase = new URLSearchParams();
    paramsBase.set('limit', '100');
    if (q) paramsBase.set('q', q);
    if (status) paramsBase.set('status', status);
    if (sortKey) { paramsBase.set('sortKey', sortKey); paramsBase.set('sortOrder', sortOrder); }

    let p = 1; let totalAll = Infinity;
    while ((p - 1) * 100 < totalAll) {
      const params = new URLSearchParams(paramsBase);
      params.set('page', String(p));
      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) break;
      const data = await res.json();
      totalAll = data.total;
      rows.push(...data.items);
      if (data.items.length < 100) break;
      p++;
    }

    const header = ['Email','Rôle','État','En ligne','IP','Géo','Dernière activité','Créé le'];
    const csv = [header, ...rows.map(u => [
      u.email,
      u.role,
      computeEtat(u),
      u.online ? 'Oui' : 'Non',
      u.lastIp ?? '-',
      geoOf(u),
      u.lastSeen ? new Date(u.lastSeen).toISOString() : '-',
      new Date(u.createdAt).toISOString(),
    ])].map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    a.href = url; a.download = `users-export-${ts}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: `Export terminé (${rows.length} lignes)` });
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label htmlFor="q" className="mb-1 block text-sm font-medium">Recherche (email)</label>
          <Input id="q" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…" />
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
        <Button onClick={onApplyFilters}>Appliquer</Button>
        <div className="flex-1" />
        <Button variant="secondary" onClick={exportCsv}>Exporter CSV</Button>
      </div>

      {selected.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-md border p-2 text-sm">
          <div className="font-medium">{selected.length} sélectionné(s)</div>
          <div className="flex-1" />
          <Button size="sm" variant="secondary" disabled={bulkLoading} onClick={() => bulkSuspend(true)}>Suspendre</Button>
          <Button size="sm" variant="secondary" disabled={bulkLoading} onClick={() => bulkSuspend(false)}>Activer</Button>
          <Button size="sm" variant="secondary" disabled={bulkLoading} onClick={() => bulkRole('admin')}>Rôle: admin</Button>
          <Button size="sm" variant="secondary" disabled={bulkLoading} onClick={() => bulkRole('user')}>Rôle: user</Button>
          <Button size="sm" variant="destructive" disabled={bulkLoading} onClick={bulkDelete}>Supprimer</Button>
        </div>
      )}

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left">
                <Checkbox checked={pageAllSelected} onCheckedChange={(c: any) => toggleSelectAllOnPage(Boolean(c))} aria-label="Sélectionner la page" />
              </th>
              <Th onClick={() => toggleSort('email')} active={sortKey === 'email'} order={sortOrder}>Email</Th>
              <Th onClick={() => toggleSort('role')} active={sortKey === 'role'} order={sortOrder}>Rôle</Th>
              <Th onClick={() => toggleSort('etat')} active={sortKey === 'etat'} order={sortOrder}>État</Th>
              <Th onClick={() => toggleSort('online')} active={sortKey === 'online'} order={sortOrder}>En ligne</Th>
              <th className="px-3 py-2 text-left font-medium">IP</th>
              <th className="px-3 py-2 text-left font-medium">Géo</th>
              <Th onClick={() => toggleSort('lastSeen')} active={sortKey === 'lastSeen'} order={sortOrder}>Dernière activité</Th>
              {renderActions && <th className="px-3 py-2 text-left font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2" colSpan={columnsCount}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}
              </>
            ) : (
              <>
                {items.length === 0 ? (
                  <tr className="border-t">
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={columnsCount}>Aucun utilisateur trouvé</td>
                  </tr>
                ) : (
                  items.map(u => {
                    const isRowLoading = Boolean(rowLoading[u.id]);
                    return (
                      <tr key={u.id} className="border-t">
                        <td className="px-3 py-2 align-top">
                          <Checkbox checked={selected.includes(u.id)} onCheckedChange={(c: any) => toggleSelect(u.id, Boolean(c))} aria-label={`Sélectionner ${u.email}`} />
                        </td>
                        <td className="px-3 py-2 align-top">{u.email}</td>
                        <td className="px-3 py-2 align-top">
                          <select
                            className="border-input bg-background text-foreground h-8 rounded-md border px-2 text-xs"
                            value={u.role}
                            disabled={isRowLoading || Boolean(u.deletedAt)}
                            onChange={(e) => updateRoleInline(u, e.target.value as 'admin' | 'user')}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap gap-1">
                              {u.deletedAt ? (
                                <span className="inline-flex items-center rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-600">Supprimé</span>
                              ) : (
                                <>
                                  {u.isSuspended && (<span className="inline-flex items-center rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600">Suspendu</span>)}
                                  {u.isLocked && (<span className="inline-flex items-center rounded bg-purple-500/10 px-2 py-0.5 text-xs text-purple-600">Bloqué</span>)}
                                  {!u.isSuspended && !u.isLocked && (<span className="inline-flex items-center rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600">Actif</span>)}
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Suspension</span>
                              <Switch checked={u.isSuspended} disabled={isRowLoading || Boolean(u.deletedAt) || Boolean(u.isLocked)} onCheckedChange={(c) => toggleSuspendInline(u, Boolean(c))} />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">{u.online ? 'Oui' : 'Non'}</td>
                        <td className="px-3 py-2 align-top">{u.lastIp ?? '-'}</td>
                        <td className="px-3 py-2 align-top">{geoOf(u)}</td>
                        <td className="px-3 py-2 align-top">{u.lastSeen ? new Date(u.lastSeen).toLocaleString() : '-'}</td>
                        {renderActions && (
                          <td className="px-3 py-2 align-top">{renderActions(u, { reload: load })}</td>
                        )}
                      </tr>
                    );
                  })
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Page {page} / {totalPages} • {total} entrées</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Précédent</Button>
          <Button size="sm" variant="secondary" disabled={page >= totalPages || loading} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Suivant</Button>
        </div>
      </div>
    </div>
  );
}

function Th({ children, onClick, active, order }: { children: React.ReactNode; onClick: () => void; active: boolean; order: 'asc' | 'desc' }) {
  return (
    <th className="px-3 py-2 text-left font-medium">
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
        <span>{children}</span>
        {active && <span aria-hidden className="text-muted-foreground">{order === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}
