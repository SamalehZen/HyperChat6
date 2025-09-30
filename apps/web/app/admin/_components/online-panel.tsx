"use client";
import { useEffect, useState } from 'react';

export function OnlinePanel() {
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
    <div className="mt-6 glass-panel rounded-lg p-6 transition-all duration-300">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Utilisateurs en ligne</h2>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 status-glow-pulse status-glow-ok" />
          <span className="text-sm font-medium text-muted-foreground">{items.length} en ligne</span>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun utilisateur en ligne</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((u) => (
            <div key={u.userId} className="glass-card rounded-lg p-4 card-lift-hover transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 status-glow-ok" />
              <div className="font-semibold text-foreground mb-1">{u.email}</div>
              <div className="text-xs text-muted-foreground">
                📍 {[u.lastCity, u.lastRegion, u.lastCountry].filter(Boolean).join(', ') || '-'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                🌐 {u.lastIp || '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}