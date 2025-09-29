"use client";
import { useEffect, useState } from 'react';
import { Button } from '@repo/ui';

export function RecentEventsPanel({ defaultLimit = 25, showFilters = true }: { defaultLimit?: number; showFilters?: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [limit, setLimit] = useState(defaultLimit);
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
    setTypes((prev) => {
      const next = prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t];
      load(limit, next);
      return next;
    });
  };

  const allTypes = ['login_failed','lockout','unlock','suspend','unsuspend','delete','account_created','account_updated'];

  return (
    <div className="mt-4 rounded-md border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Événements récents (24h)</h2>
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            {allTypes.map((t) => (
              <label key={t} className={`text-xs ${types.includes(t) ? 'font-semibold' : ''}`}>
                <input type="checkbox" className="mr-1 align-middle" checked={types.includes(t)} onChange={() => toggleType(t)} />
                {t}
              </label>
            ))}
          </div>
        )}
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
                <td className="max-w-[260px] truncate px-3 py-2">{it.details ? JSON.stringify(it.details) : '-'}</td>
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
