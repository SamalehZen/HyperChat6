"use client";
import { useEffect, useMemo, useState } from 'react';

export type WindowSel = '24h' | '7j' | '30j';

export function KPIHeader({ windowSel, onWindowChange }: { windowSel: WindowSel; onWindowChange: (w: WindowSel) => void }) {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [health, setHealth] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const [mRes, hRes] = await Promise.all([
        fetch(`/api/admin/metrics?window=${windowSel}`, { cache: 'no-store' }),
        fetch(`/api/admin/health?window=${windowSel}`, { cache: 'no-store' }),
      ]);
      if (!isMounted) return;
      if (mRes.ok) setMetrics(await mRes.json());
      if (hRes.ok) setHealth(await hRes.json());
    };
    load();
    return () => { isMounted = false; };
  }, [windowSel]);

  const deltaPct = (curr: number, prev: number) => {
    if (!isFinite(curr) || !isFinite(prev)) return null;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const onlineAvg = metrics?.totals?.onlineAvg ?? 0;
  const onlinePrev = metrics?.previousTotals?.onlineAvg ?? 0;
  const onlineDelta = deltaPct(onlineAvg, onlinePrev);

  const susp = metrics?.totals?.suspended ?? 0;
  const suspPrev = metrics?.previousTotals?.suspended ?? 0;
  const suspDelta = deltaPct(susp, suspPrev);

  const del = metrics?.totals?.deleted ?? 0;
  const delPrev = metrics?.previousTotals?.deleted ?? 0;
  const delDelta = deltaPct(del, delPrev);

  const totalAIRequests = useMemo(() => {
    if (!metrics?.usageByMode?.totals) return 0;
    return Object.values(metrics.usageByMode.totals).reduce((a: number, b: number) => a + b, 0);
  }, [metrics]);
  const prevTotalAIRequests = useMemo(() => {
    if (!metrics?.usageByMode?.previousTotals) return 0;
    return Object.values(metrics.usageByMode.previousTotals).reduce((a: number, b: number) => a + b, 0);
  }, [metrics]);
  const totalAIRequestsDelta = deltaPct(totalAIRequests, prevTotalAIRequests);
  const aiRequestsSeries: number[] = useMemo(() => {
    if (!metrics?.usageByMode?.series) return [];
    const modes = metrics.usageByMode.series.modes || {};
    const dates = metrics.usageByMode.series.dates || [];
    return dates.map((_: string, i: number) => Object.values(modes).reduce((sum: number, arr: any) => sum + (arr?.[i] ?? 0), 0));
  }, [metrics]);

  const p95 = health?.overall?.latencyP95Ms ?? 0;
  const prevP95 = health?.previousOverall?.latencyP95Ms ?? 0;
  const p95Delta = deltaPct(p95, prevP95);

  const errRate = health?.overall?.errorRatePct ?? 0;
  const prevErrRate = health?.previousOverall?.errorRatePct ?? 0;
  const errRateDelta = deltaPct(errRate, prevErrRate);

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Indicateurs clés</h2>
        <div className="flex items-center gap-1 rounded-md border p-0.5" aria-label="Période (Afrique/Djibouti)" title="Période (Afrique/Djibouti)">
          {(['24h','7j','30j'] as const).map((w) => (
            <button key={w} onClick={() => onWindowChange(w)} className={`px-2 py-1 text-xs rounded ${windowSel===w ? 'bg-muted font-medium' : 'hover:bg-muted/50'}`}>{w}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard title={`En ligne (moy. ${windowSel})`} value={onlineAvg} delta={onlineDelta} series={metrics?.series?.onlineCount ?? []} dates={metrics?.series?.dates ?? []} color="emerald" />
        <KpiCard title={`Total requêtes AI (${windowSel})`} value={totalAIRequests} delta={totalAIRequestsDelta} series={aiRequestsSeries} dates={metrics?.series?.dates ?? []} color="sky" />
        <KpiCard title={`p95 latence (${windowSel})`} value={`${p95} ms`} delta={p95Delta} series={[]} dates={metrics?.series?.dates ?? []} color="amber" />
        <KpiCard title={`Taux d’erreur (${windowSel})`} value={`${errRate}%`} delta={errRateDelta} series={[]} dates={metrics?.series?.dates ?? []} color="red" />
        <KpiCard title={`Suspensions (${windowSel})`} value={susp} delta={suspDelta} series={metrics?.series?.suspendedCount ?? []} dates={metrics?.series?.dates ?? []} color="amber" />
        <KpiCard title={`Suppressions (${windowSel})`} value={del} delta={delDelta} series={metrics?.series?.deletedCount ?? []} dates={metrics?.series?.dates ?? []} color="red" />
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
        {series?.length ? <MiniSpark series={series} color={color} /> : <div className="h-16 w-28" aria-hidden />}
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
    <div className="flex h-16 w-28 items-end gap-1" aria-label="Tendance">
      {heights.map((h, i) => (
        <div key={i} className={`${colors[color]} w-2 rounded`} style={{ height: `${h}px` }} aria-label={`Point ${i+1}: ${series[i]}`} />
      ))}
    </div>
  );
}
