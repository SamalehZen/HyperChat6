"use client";
import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export function CostCharts({ windowSel }: { windowSel: '24h'|'7j'|'30j' }) {
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
    const series = metrics?.costByMode?.series;
    if (!series) return [];
    const { dates, modes } = series as { dates: string[]; modes: Record<string, number[]> };
    return dates.map((d: string, i: number) => {
      const row: any = { date: d };
      Object.keys(modes || {}).forEach(k => { row[k] = modes[k]?.[i] ?? 0; });
      return row;
    });
  }, [metrics]);

  const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#84cc16', '#06b6d4'];

  const formatterUsd = (v: number) => `$${(v ?? 0).toFixed(2)}`;

  return (
    <div className="mt-4 rounded-md border p-4">
      <h2 className="mb-3 text-lg font-semibold">Coût par mode (séries)</h2>
      <div className="w-full h-64" aria-label="Coût par mode (aire empilée)">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={areaData} stackOffset="expand">
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} hide />
            <Tooltip formatter={(v: any, name: any) => [formatterUsd(v), name]} labelFormatter={(l) => `Date: ${l}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {Object.keys(metrics?.costByMode?.series?.modes || {}).map((mode, idx) => (
              <Area key={mode} type="monotone" dataKey={mode} stackId="1" stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} name={mode} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
