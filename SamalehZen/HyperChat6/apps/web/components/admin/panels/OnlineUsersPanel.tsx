"use client";

import { useEffect, useState } from 'react';
import { Button, Skeleton } from '@repo/ui';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL ?? '';

export function OnlineUsersPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/admin/online`, { cache: 'no-store', credentials: 'include' });
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        if (!cancelled) setItems(data.items);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur réseau');
      } finally {
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border p-3 text-sm">
        <div className="mb-2 font-medium">Impossible de charger les utilisateurs en ligne</div>
        <div className="text-muted-foreground mb-3">{error}</div>
        <Button size="sm" variant="secondary" onClick={() => { /* reload on demand */ location.reload(); }}>Réessayer</Button>
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun utilisateur en ligne</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {items.map((u: any) => (
        <div key={u.userId} className="rounded border p-2">
          <div className="font-medium">{u.email}</div>
          <div className="text-xs text-muted-foreground">{[u.lastCity, u.lastRegion, u.lastCountry].filter(Boolean).join(', ') || '-'} • {u.lastIp || '-'}</div>
        </div>
      ))}
    </div>
  );
}
