"use client";

import { useEffect, useState } from 'react';
import { Button, Skeleton } from '@repo/ui';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL ?? '';

export function RecentEventsPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [limit, setLimit] = useState(25);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (currentLimit = limit, currentTypes = types) => {
    setLoading(true); setError(null);
    const params = new URLSearchParams();
    params.set('limit', String(currentLimit));
    if (currentTypes.length) params.set('types', currentTypes.join(','));
    try {
      const res = await fetch(`${API_BASE}/api/admin/events/recent?${params.toString()}`, { cache: 'no-store', credentials: 'include' });
      if (!res.ok) throw new Error(res.statusText);
      setItems((await res.json()).items);
    } catch (e: any) {
      setError(e?.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
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
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-base font-medium">Événements récents (24h)</h3>
        <div className="flex flex-wrap gap-2">
          {allTypes.map(t => (
            <label key={t} className={`text-xs ${types.includes(t) ? 'font-semibold' : ''}`}>
              <input type="checkbox" className="mr-1 align-middle" checked={types.includes(t)} onChange={() => toggleType(t)} />
              {t}
            </label>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : error ? (
        <div className="rounded-md border p-3 text-sm">
          <div className="mb-2 font-medium">Impossible de charger les événements</div>
          <div className="text-muted-foreground mb-3">{error}</div>
          <Button size="sm" variant="secondary" onClick={() => load()}>Réessayer</Button>
        </div>
      ) : (
        <>
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
                {items.length === 0 ? (
                  <tr className="border-t">
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>Aucun événement récent</td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="px-3 py-2">{new Date(it.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2">{it.action}</td>
                      <td className="px-3 py-2">{it.ip || '-'}</td>
                      <td className="px-3 py-2">{[it.city, it.region, it.country].filter(Boolean).join(', ') || '-'}</td>
                      <td className="px-3 py-2 max-w-[260px] truncate">{it.details ? JSON.stringify(it.details) : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-right">
            <Button size="sm" variant="secondary" onClick={() => { const nl = limit + 25; setLimit(nl); load(nl); }}>Charger plus</Button>
          </div>
        </>
      )}
    </div>
  );
}
