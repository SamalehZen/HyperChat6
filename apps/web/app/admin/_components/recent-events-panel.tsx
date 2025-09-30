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

  return (
    <div className="mt-6 glass-panel rounded-lg p-6 transition-all duration-300">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-foreground">Événements récents (24h)</h2>
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            {allTypes.map((t) => (
              <label key={t} className={`glass-card-secondary px-2.5 py-1 rounded-md text-xs cursor-pointer transition-all duration-200 ${types.includes(t) ? 'bg-brand text-white font-semibold' : 'hover:bg-white/60 dark:hover:bg-black/30'}`}>
                <input type="checkbox" className="mr-1.5 align-middle" checked={types.includes(t)} onChange={() => toggleType(t)} />
                {t}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="glass-card overflow-hidden rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="glass-card-secondary border-b border-border/40">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Type</th>
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
      <div className="mt-4 text-right">
        <Button size="sm" variant="secondary" onClick={() => { const nl = limit + 25; setLimit(nl); load(nl); }} className="glass-card-secondary glow-hover-info">
          Charger plus
        </Button>
      </div>
    </div>
  );
}