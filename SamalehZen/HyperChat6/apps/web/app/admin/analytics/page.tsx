'use client';

import { useEffect, useState } from 'react';
import { Button, Skeleton } from '@repo/ui';
import { KpiCard } from '@/components/admin/kpi/KpiCard';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL ?? '';

export default function AnalyticsPage() {
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
      <h1 className="mb-2 text-2xl font-semibold">Analytique</h1>
      <p className="text-sm text-muted-foreground mb-4">Aperçu des tendances et indicateurs.</p>

      {loading ? (
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <div className="mb-4 rounded-md border p-3 text-sm">
          <div className="mb-1 font-medium">Impossible de charger les métriques</div>
          <div className="text-muted-foreground mb-3">{error}</div>
          <Button size="sm" variant="secondary" onClick={() => location.reload()}>Réessayer</Button>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <KpiCard title="Utilisateurs en ligne (1 min)" value={data?.onlineCount ?? '-'} series={data?.series?.onlineCount ?? []} dates={data?.series?.dates ?? []} color="emerald" />
            <KpiCard title="Comptes suspendus" value={data?.suspendedCount ?? '-'} series={data?.series?.suspendedCount ?? []} dates={data?.series?.dates ?? []} color="amber" />
            <KpiCard title="Comptes supprimés" value={data?.deletedCount ?? '-'} series={data?.series?.deletedCount ?? []} dates={data?.series?.dates ?? []} color="red" />
            <KpiCard title="Réactivations après lockout (24h)" value={data?.reactivatedAfterLockoutCount ?? '-'} series={data?.series?.reactivatedAfterLockoutCount ?? []} dates={data?.series?.dates ?? []} color="sky" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <section className="rounded-md border p-4">
              <h2 className="mb-2 text-lg font-semibold">Tendances récentes</h2>
              <p className="text-sm text-muted-foreground mb-2">Évolution des principaux indicateurs (24–48h).</p>
              <div className="grid grid-cols-2 gap-3">
                <KpiCard title="En ligne" value={data?.onlineCount ?? '-'} series={data?.series?.onlineCount ?? []} dates={data?.series?.dates ?? []} color="emerald" />
                <KpiCard title="Suspendus" value={data?.suspendedCount ?? '-'} series={data?.series?.suspendedCount ?? []} dates={data?.series?.dates ?? []} color="amber" />
                <KpiCard title="Supprimés" value={data?.deletedCount ?? '-'} series={data?.series?.deletedCount ?? []} dates={data?.series?.dates ?? []} color="red" />
                <KpiCard title="Réactivations" value={data?.reactivatedAfterLockoutCount ?? '-'} series={data?.series?.reactivatedAfterLockoutCount ?? []} dates={data?.series?.dates ?? []} color="sky" />
              </div>
            </section>

            <section className="rounded-md border p-4">
              <h2 className="mb-2 text-lg font-semibold">Notes</h2>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li>Les sources de données sont basées sur /api/admin/metrics.</li>
                <li>États d’erreur et skeletons gérés côté client.</li>
                <li>Des graphes avancés (Chart.js) peuvent être ajoutés en v2.</li>
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
