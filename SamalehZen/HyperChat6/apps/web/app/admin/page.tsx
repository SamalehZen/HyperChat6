'use client';

import { useEffect, useState } from 'react';
import { Button, Skeleton } from '@repo/ui';
import { KpiCard } from '@/components/admin/kpi/KpiCard';
import { SectionCard } from '@/components/admin/cards/SectionCard';
import { RecentEventsPanel } from '@/components/admin/panels/RecentEventsPanel';
import { OnlineUsersPanel } from '@/components/admin/panels/OnlineUsersPanel';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL ?? '';

export default function DashboardPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/admin/metrics`, { cache: 'no-store', credentials: 'include' });
        if (!res.ok) throw new Error(res.statusText);
        setData(await res.json());
      } catch (e: any) {
        setError(e?.message || 'Erreur réseau');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Tableau de bord</h1>

      {loading ? (
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <div className="mb-4 rounded-md border p-3 text-sm">
          <div className="mb-1 font-medium">Impossible de charger les indicateurs</div>
          <div className="text-muted-foreground mb-3">{error}</div>
          <Button size="sm" variant="secondary" onClick={() => location.reload()}>Réessayer</Button>
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <KpiCard
            title="Utilisateurs en ligne (1 min)"
            value={data?.onlineCount ?? '-'}
            series={data?.series?.onlineCount ?? []}
            dates={data?.series?.dates ?? []}
            color="emerald"
          />
          <KpiCard
            title="Comptes suspendus"
            value={data?.suspendedCount ?? '-'}
            series={data?.series?.suspendedCount ?? []}
            dates={data?.series?.dates ?? []}
            color="amber"
          />
          <KpiCard
            title="Comptes supprimés"
            value={data?.deletedCount ?? '-'}
            series={data?.series?.deletedCount ?? []}
            dates={data?.series?.dates ?? []}
            color="red"
          />
          <KpiCard
            title="Réactivations après lockout (24h)"
            value={data?.reactivatedAfterLockoutCount ?? '-'}
            series={data?.series?.reactivatedAfterLockoutCount ?? []}
            dates={data?.series?.dates ?? []}
            color="sky"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Événements récents">
          <RecentEventsPanel />
        </SectionCard>
        <SectionCard title="Utilisateurs en ligne">
          <OnlineUsersPanel />
        </SectionCard>
      </div>
    </div>
  );
}
