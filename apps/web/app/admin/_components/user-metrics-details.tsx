"use client";
import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export function UserMetricsDetails({ userId, initialWindow }: { userId: string; initialWindow?: '24h'|'7j'|'30j' }) {
  const [windowSel, setWindowSel] = useState<'24h'|'7j'|'30j'>(initialWindow || '7j');
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/metrics?window=${windowSel}`, { cache: 'no-store' });
      if (!mounted) return;
      if (res.ok) setData(await res.json());
    };
    load();
    return () => { mounted = false; };
  }, [userId, windowSel]);

  const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b'];
  const formatUsd = (v: number) => `$${(v ?? 0).toFixed(2)}`;

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Détails utilisateur</h1>
          <p className="text-sm text-muted-foreground">ID: <span className="font-medium">{userId}</span> • Période: {windowSel} (Afrique/Djibouti)</p>
        </div>
        <div className="flex items-center gap-1 rounded-md border p-0.5" aria-label="Période (Afrique/Djibouti)">
          {(['24h','7j','30j'] as const).map((w) => (
            <button key={w} onClick={() => setWindowSel(w)} className={`px-2 py-1 text-xs rounded ${windowSel===w ? 'bg-muted font-medium' : 'hover:bg-muted/50'}`}>{w}</button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-md border p-3">
          <div className="text-sm text-muted-foreground">Tokens (prompt)</div>
          <div className="text-2xl font-semibold">{data?.totals?.promptTokens ?? 0}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-sm text-muted-foreground">Tokens (complétion)</div>
          <div className="text-2xl font-semibold">{data?.totals?.completionTokens ?? 0}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-sm text-muted-foreground">Coût total</div>
          <div className="text-2xl font-semibold">{formatUsd(data?.totals?.costUsd ?? 0)}</div>
        </div>
      </div>

      <div className="rounded-md border p-4" aria-label="Séries tokens et coût">
        <h2 className="mb-2 text-lg font-semibold">Séries (tokens & coût)</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={(data?.series?.dates || []).map((d: string, i: number) => ({
              date: d,
              prompt: data?.series?.promptTokens?.[i] ?? 0,
              completion: data?.series?.completionTokens?.[i] ?? 0,
              costUsd: data?.series?.costUsd?.[i] ?? 0,
            }))}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any, name: any) => [name === 'costUsd' ? formatUsd(Number(v)) : Number(v).toLocaleString('fr-FR'), name]} labelFormatter={(l) => `Date : ${new Date(l).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area dataKey="prompt" name="Tokens prompt" type="monotone" stroke={COLORS[0]} fill={COLORS[0]} />
              <Area dataKey="completion" name="Tokens complétion" type="monotone" stroke={COLORS[1]} fill={COLORS[1]} />
              <Area dataKey="costUsd" name="Coût ($)" type="monotone" stroke={COLORS[2]} fill={COLORS[2]} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
