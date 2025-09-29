"use client";
import { useEffect, useState } from 'react';

export function KPIHeader() {
  const [data, setData] = useState<any | null>(null);
  const [windowSel, setWindowSel] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/admin/metrics?window=${windowSel}`, { cache: 'no-store' });
      if (res.ok) setData(await res.json());
    };
    load();
  }, [windowSel]);

  const deltaPct = (curr: number, prev: number) => {
    if (!isFinite(curr) || !isFinite(prev)) return null;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const onlineAvg = data?.totals?.onlineAvg ?? 0;
  const onlinePrev = data?.previousTotals?.onlineAvg ?? 0;
  const onlineDelta = deltaPct(onlineAvg, onlinePrev);

  const susp = data?.totals?.suspended ?? 0;
  const suspPrev = data?.previousTotals?.suspended ?? 0;
  const suspDelta = deltaPct(susp, suspPrev);

  const del = data?.totals?.deleted ?? 0;
  const delPrev = data?.previousTotals?.deleted ?? 0;
  const delDelta = deltaPct(del, delPrev);

  const unl = data?.totals?.unlock ?? 0;
  const unlPrev = data?.previousTotals?.unlock ?? 0;
  const unlDelta = deltaPct(unl, unlPrev);

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Indicateurs clés</h2>
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          {(['24h','7d','30d'] as const).map((w) => (
            <button key={w} onClick={() => setWindowSel(w)} className={`px-2 py-1 text-xs rounded ${windowSel===w ? 'bg-muted font-medium' : 'hover:bg-muted/50'}`}>{w}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <KpiCard title={`En ligne (moy. ${windowSel})`} value={onlineAvg} delta={onlineDelta} series={data?.series?.onlineCount ?? []} dates={data?.series?.dates ?? []} color="emerald" />
        <KpiCard title={`Suspensions (${windowSel})`} value={susp} delta={suspDelta} series={data?.series?.suspendedCount ?? []} dates={data?.series?.dates ?? []} color="amber" />
        <KpiCard title={`Suppressions (${windowSel})`} value={del} delta={delDelta} series={data?.series?.deletedCount ?? []} dates={data?.series?.dates ?? []} color="red" />
        <KpiCard title={`Réactivations (${windowSel})`} value={unl} delta={unlDelta} series={data?.series?.reactivatedAfterLockoutCount ?? []} dates={data?.series?.dates ?? []} color="sky" />
      </div>
    </div>
  );
}

function KpiCard({ title, value, delta, series, dates, color }: { title: string; value: number | string; delta?: number | null; series: number[]; dates: string[]; color: 'emerald' | 'amber' | 'red' | 'sky' }) {
  const trendColor = typeof delta === 'number' ? (delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-muted-foreground') : 'text-muted-foreground';
  const sign = typeof delta === 'number' && delta > 0 ? '+' : '';
  return (
    <div className="rounded-md border p-3">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div>
          <div className="text-2xl font-semibold">{value}</div>
          {typeof delta === 'number' && (
            <div className={`text-xs ${trendColor}`}>{sign}{delta}% vs période précédente</div>
          )}
        </div>
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
