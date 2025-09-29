"use client";
import { useEffect, useState } from 'react';

export function KPIHeader() {
  const [data, setData] = useState<any | null>(null);
  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/admin/metrics', { cache: 'no-store' });
      if (res.ok) setData(await res.json());
    };
    load();
  }, []);
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
      <KpiCard title="Utilisateurs en ligne (1 min)" value={data?.onlineCount ?? '-'} series={data?.series?.onlineCount ?? []} dates={data?.series?.dates ?? []} color="emerald" />
      <KpiCard title="Comptes suspendus" value={data?.suspendedCount ?? '-'} series={data?.series?.suspendedCount ?? []} dates={data?.series?.dates ?? []} color="amber" />
      <KpiCard title="Comptes supprimés" value={data?.deletedCount ?? '-'} series={data?.series?.deletedCount ?? []} dates={data?.series?.dates ?? []} color="red" />
      <KpiCard title="Réactivations après lockout (24h)" value={data?.reactivatedAfterLockoutCount ?? '-'} series={data?.series?.reactivatedAfterLockoutCount ?? []} dates={data?.series?.dates ?? []} color="sky" />
    </div>
  );
}

function KpiCard({ title, value, series, dates, color }: { title: string; value: number | string; series: number[]; dates: string[]; color: 'emerald' | 'amber' | 'red' | 'sky' }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="text-2xl font-semibold">{value}</div>
        <MiniSpark series={series} color={color} />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{dates?.[0]} → {dates?.[dates.length-1]}</div>
    </div>
  );
}

export function MiniSpark({ series, color }: { series: number[]; color: 'emerald' | 'amber' | 'red' | 'sky' }) {
  const max = Math.max(1, ...series);
  const heights = series.map(v => Math.max(2, Math.round((v / max) * 24)));
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/70',
    amber: 'bg-amber-500/70',
    red: 'bg-red-500/70',
    sky: 'bg-sky-500/70',
  };
  return (
    <div className="flex h-16 w-28 items-end gap-1">
      {heights.map((h, i) => (
        <div key={i} className={`${colors[color]} w-2 rounded`} style={{ height: `${h}px` }} />
      ))}
    </div>
  );
}
