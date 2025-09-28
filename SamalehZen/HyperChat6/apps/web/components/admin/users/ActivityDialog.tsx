"use client";

import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent } from '@repo/ui';
import type { UserRow } from './UserTable';

export function ActivityDialog({ user, open, onOpenChange }: { user: UserRow | null; open: boolean; onOpenChange: (o: boolean) => void; }) {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [order, setOrder] = useState<'asc'|'desc'>('desc');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      setPage(1);
      setOrder('desc');
    }
  }, [open, user?.id]);

  useEffect(() => {
    const load = async () => {
      if (!user || !open) return;
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
    load();
  }, [open, user?.id, page, order]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
