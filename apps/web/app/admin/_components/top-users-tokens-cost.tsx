"use client";
import { useEffect, useMemo, useState } from 'react';
import { MiniSpark } from './metrics';

export function TopUsersTokensCost({ windowSel, limit = 3 }: { windowSel: '24h'|'7j'|'30j'; limit?: number }) {
  const [data, setData] = useState<{ window: string; top: Array<{ userId: string; promptTokens: number; completionTokens: number; costUsd: number; series: { dates: string[]; tokens: number[]; costUsd: number[] } }> } | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await fetch(`/api/admin/users/metrics/top?window=${windowSel}&limit=${limit}`, { cache: 'no-store' });
      if (!mounted) return;
      if (res.ok) setData(await res.json());
    };
    load();
    return () => { mounted = false; };
  }, [windowSel, limit]);

  const formatUsd = (v: number) => `$${(v ?? 0).toFixed(2)}`;

  return (
    <div className="mt-6 glass-panel rounded-lg p-6 transition-all duration-300">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Top utilisateurs — Tokens & Coût</h2>
        <div className="glass-card-secondary px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground" aria-label="Période (Afrique/Djibouti)">Période: {windowSel}</div>
      </div>
      <div className="glass-card overflow-hidden rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="glass-card-secondary border-b border-border/40">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-foreground">ID</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">Tokens (prompt)</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">Tokens (complétion)</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">Coût</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Tendance</th>
            </tr>
          </thead>
          <tbody>
            {data?.top?.map((r, idx) => (
              <tr key={r.userId} className={`border-t border-border/30 transition-colors duration-200 ${idx % 2 === 0 ? 'bg-white/20 dark:bg-black/10' : 'bg-transparent'} hover:bg-white/40 dark:hover:bg-black/20`}>
                <td className="px-4 py-3">
                  <a className="underline-offset-2 hover:underline font-medium text-brand transition-colors" href={`/admin/users/${encodeURIComponent(r.userId)}/metrics?window=${windowSel}`} aria-label={`Détails ${r.userId}`}>{r.userId}</a>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{r.promptTokens.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{r.completionTokens.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-600">{formatUsd(r.costUsd)}</td>
                <td className="px-4 py-3"><MiniSpark series={r.series.tokens} color="sky" /></td>
              </tr>
            ))}
            {(!data || data.top.length === 0) && (
              <tr className="border-t"><td className="px-4 py-3 text-muted-foreground" colSpan={5}>Aucune donnée</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}