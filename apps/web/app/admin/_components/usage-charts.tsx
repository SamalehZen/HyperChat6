"use client";
import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export function UsageCharts({ windowSel }: { windowSel: '24h'|'7j'|'30j' }) {
  const [metrics, setMetrics] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await fetch(`/api/admin/metrics?window=${windowSel}`, { cache: 'no-store' });
      if (!mounted) return;
      if (res.ok) setMetrics(await res.json());
    };
    load();
    return () => { mounted = false; };
  }, [windowSel]);

  const areaData = useMemo(() => {
    if (!metrics?.usageByMode?.series) return [];
    const dates: string[] = metrics.usageByMode.series.dates || [];
    const modes: Record<string, number[]> = metrics.usageByMode.series.modes || {};
    return dates.map((d: string, i: number) => {
      const row: any = { date: d };
      Object.keys(modes).forEach(k => { row[k] = modes[k]?.[i] ?? 0; });
      return row;
    });
  }, [metrics]);

  const pieData = useMemo(() => {
    if (!metrics?.usageByMode?.totals) return [];
    return Object.entries(metrics.usageByMode.totals).map(([name, value]) => ({ name, value }));
  }, [metrics]);

  const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#84cc16', '#06b6d4'];

  return (
    <div className="mt-4 rounded-md border p-4">
      <h2 className="mb-3 text-lg font-semibold">Utilisation par mode</h2>
      <div className="grid grid-cols-1 gap-4">
        <div className="w-full h-64" aria-label="Messages par mode (aire empilée)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} stackOffset="expand">
              <XAxis dataKey="date" hide={false} tick={{ fontSize: 10 }} />
              <YAxis hide tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any, name: any) => [`${(Number(v) * 100).toFixed(1)} %`, name]} labelFormatter={(l) => `Date : ${new Date(l).toLocaleString('fr-FR', { dateStyle: windowSel === '24h' ? 'short' : 'medium', timeStyle: windowSel === '24h' ? 'short' : undefined })}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {Object.keys(metrics?.usageByMode?.series?.modes || {}).map((mode, idx) => (
                <Area key={mode} type="monotone" dataKey={mode} stackId="1" stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} name={mode} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full h-64" aria-label="Répartition actuelle par mode">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip formatter={(v: any, name: any) => [Number(v).toLocaleString('fr-FR'), name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(p) => `${p.name} (${p.value})`} aria-label="Répartition par mode">
                {pieData.map((entry: any, idx: number) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
