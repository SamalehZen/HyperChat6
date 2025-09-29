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
