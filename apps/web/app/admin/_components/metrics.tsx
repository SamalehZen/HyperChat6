"use client";
import { useEffect, useMemo, useState } from 'react';

export type WindowSel = '24h' | '7j' | '30j';

type UsageByModeSeries = {
  dates: string[];
  modes: Record<string, number[]>;
};

type MetricsResponse = {
  window: '24h'|'7j'|'30j';
  onlineCount: number;
  totals: { suspended: number; deleted: number; unlock: number; onlineAvg: number };
  previousTotals: { suspended: number; deleted: number; unlock: number; onlineAvg: number };
  series: { dates: string[]; onlineCount: number[]; suspendedCount: number[]; deletedCount: number[]; reactivatedAfterLockoutCount: number[] };
  usageByMode?: { totals: Record<string, number>; previousTotals: Record<string, number>; series: UsageByModeSeries };
};

type HealthRow = { key: string; provider: string; keyPresent: boolean; latencyAvgMs: number; latencyP95Ms: number; errorRatePct: number; status: 'ok'|'warn'|'down' };

type HealthResponse = { window: '24h'|'7j'|'30j'; providers: HealthRow[]; overall: { latencyAvgMs: number; latencyP95Ms: number; errorRatePct: number; worstStatus: string }; previousOverall?: { latencyAvgMs: number; latencyP95Ms: number; errorRatePct: number; worstStatus: string } };

export function KPIHeader({ windowSel, onWindowChange }: { windowSel: WindowSel; onWindowChange: (w: WindowSel) => void }) {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

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
    const totals = metrics?.usageByMode?.totals as Record<string, number> | undefined;
    if (!totals) return 0;
    return Object.values(totals).reduce((a, b) => a + b, 0);
  }, [metrics]);
  const prevTotalAIRequests = useMemo(() => {
    const prevTotals = metrics?.usageByMode?.previousTotals as Record<string, number> | undefined;
    if (!prevTotals) return 0;
    return Object.values(prevTotals).reduce((a, b) => a + b, 0);
  }, [metrics]);
  const totalAIRequestsDelta = deltaPct(totalAIRequests, prevTotalAIRequests);
  const aiRequestsSeries: number[] = useMemo(() => {
    if (!metrics?.usageByMode?.series) return [];
    const modes = (metrics.usageByMode.series.modes || {}) as Record<string, number[]>;
    const dates = metrics.usageByMode.series.dates || [];
    return dates.map((_, i) => Object.values(modes).reduce((sum, arr) => sum + (arr?.[i] ?? 0), 0));
  }, [metrics]);

  const p95 = health?.overall?.latencyP95Ms ?? 0;
  const prevP95 = health?.previousOverall?.latencyP95Ms ?? 0;
  const p95Delta = deltaPct(p95, prevP95);

  const errRate = health?.overall?.errorRatePct ?? 0;
  const prevErrRate = health?.previousOverall?.errorRatePct ?? 0;
  const errRateDelta = deltaPct(errRate, prevErrRate);

  const top3Cost = useMemo(() => {
    const totals = (metrics as any)?.costByMode?.totals as Record<string, number> | undefined;
    if (!totals) return [];
    return Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,3);
  }, [metrics]);
  const formatUsd = (v: number) => `$${(v ?? 0).toFixed(2)}`;

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Indicateurs clés</h2>
        <div className="glass-card-secondary flex items-center gap-1 rounded-lg p-1 shadow-sm" aria-label="Période (Afrique/Djibouti)" title="Période (Afrique/Djibouti)">
          {(['24h','7j','30j'] as const).map((w) => (
            <button key={w} onClick={() => onWindowChange(w)} className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all duration-200 ${windowSel===w ? 'bg-brand text-white shadow-sm' : 'hover:bg-white/60 dark:hover:bg-black/30 text-muted-foreground'}`}>{w}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard title={`En ligne (moy. ${windowSel})`} value={onlineAvg} delta={onlineDelta} series={metrics?.series?.onlineCount ?? []} dates={metrics?.series?.dates ?? []} color="emerald" />
        <KpiCard title={`Total requêtes AI (${windowSel})`} value={totalAIRequests} delta={totalAIRequestsDelta} series={aiRequestsSeries} dates={metrics?.series?.dates ?? []} color="sky" />
        <KpiCard title={`p95 latence (${windowSel})`} value={`${p95} ms`} delta={p95Delta} series={[]} dates={metrics?.series?.dates ?? []} color="amber" />
        <KpiCard title={`Taux d’erreur (${windowSel})`} value={`${errRate}%`} delta={errRateDelta} series={[]} dates={metrics?.series?.dates ?? []} color="red" />
        <KpiCard title={`Suspensions (${windowSel})`} value={susp} delta={suspDelta} series={metrics?.series?.suspendedCount ?? []} dates={metrics?.series?.dates ?? []} color="amber" />
        <KpiCard title={`Suppressions (${windowSel})`} value={del} delta={delDelta} series={metrics?.series?.deletedCount ?? []} dates={metrics?.series?.dates ?? []} color="red" />
        <div className="glass-panel rounded-lg p-4 transition-all duration-300 hover:shadow-lg">
          <div className="text-sm font-medium text-muted-foreground mb-3">Top 3 modes par coût ({windowSel})</div>
          <ul className="space-y-2.5">
            {top3Cost.length === 0 && <li className="text-sm text-muted-foreground">Aucune donnée</li>}
            {top3Cost.map(([mode, usd]) => (
              <li key={mode} className="flex items-center justify-between group">
                <a className="text-sm underline-offset-2 hover:underline text-foreground font-medium transition-colors hover:text-brand" href={`/admin/metrics/mode/${encodeURIComponent(mode)}?window=${windowSel}`} aria-label={`Détails ${mode}`}>{mode}</a>
                <span className="text-lg font-bold tabular-nums text-emerald-600">{formatUsd(usd as number)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, delta, series, dates, color }: { title: string; value: number | string; delta?: number | null; series: number[]; dates: string[]; color: 'emerald' | 'amber' | 'red' | 'sky' }) {
  const trendColor = typeof delta === 'number' ? (delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-muted-foreground') : 'text-muted-foreground';
  const sign = typeof delta === 'number' && delta > 0 ? '+' : '';
  const fmt = (s?: string) => s ? new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '';
  
  const glowColor = color === 'emerald' ? 'success' : color === 'amber' ? 'warning' : color === 'red' ? 'error' : 'info';
  const glowHoverClass = `glow-hover-${glowColor}`;
  
  return (
    <div className={`glass-card rounded-lg p-4 transition-all duration-300 card-lift-hover ${glowHoverClass}`}>
      <div className="text-sm font-medium text-muted-foreground mb-2">{title}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-bold text-foreground">{value}</div>
          {typeof delta === 'number' && (
            <div className={`flex items-center gap-1 text-sm font-medium mt-1 ${trendColor}`}>
              {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}
              <span>{sign}{delta}%</span>
            </div>
          )}
        </div>
        {series?.length ? <MiniSpark series={series} color={color} /> : <div className="h-20 w-32" aria-hidden />}
      </div>
      <div className="mt-3 text-xs font-medium text-muted-foreground border-t border-border/40 pt-2">{fmt(dates?.[0])} → {fmt(dates?.[dates.length-1])}</div>
    </div>
  );
}

export function MiniSpark({ series, color }: { series: number[]; color: 'emerald' | 'amber' | 'red' | 'sky' }) {
  const max = Math.max(1, ...series);
  const heights = series.map(v => Math.max(3, Math.round((v / max) * 32)));
  const colors: Record<string, string> = {
    emerald: 'bg-gradient-to-t from-emerald-500 to-emerald-400',
    amber: 'bg-gradient-to-t from-amber-500 to-amber-400',
    red: 'bg-gradient-to-t from-red-500 to-red-400',
    sky: 'bg-gradient-to-t from-sky-500 to-sky-400',
  };
  return (
    <div className="flex h-20 w-32 items-end gap-1" aria-label="Tendance">
      {heights.map((h, i) => (
        <div key={i} className={`${colors[color]} w-2 rounded-sm shadow-sm opacity-90 hover:opacity-100 transition-opacity`} style={{ height: `${h}px` }} aria-label={`Point ${i+1}: ${series[i]}`} />
      ))}
    </div>
  );
}
