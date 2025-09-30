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
    <div className="mt-4 rounded-md border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Top utilisateurs — Tokens & Coût</h2>
        <div className="text-xs text-muted-foreground" aria-label="Période (Afrique/Djibouti)">Période: {windowSel}</div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">ID</th>
              <th className="px-3 py-2 text-right font-medium">Tokens (prompt)</th>
              <th className="px-3 py-2 text-right font-medium">Tokens (complétion)</th>
              <th className="px-3 py-2 text-right font-medium">Coût</th>
              <th className="px-3 py-2 text-left font-medium">Tendance</th>
            </tr>
          </thead>
          <tbody>
            {data?.top?.map((r) => (
              <tr key={r.userId} className="border-t">
                <td className="px-3 py-2">
                  <a className="underline-offset-2 hover:underline" href={`/admin/users/${encodeURIComponent(r.userId)}/metrics?window=${windowSel}`} aria-label={`Détails ${r.userId}`}>{r.userId}</a>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.promptTokens}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.completionTokens}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatUsd(r.costUsd)}</td>
                <td className="px-3 py-2"><MiniSpark series={r.series.tokens} color="sky" /></td>
              </tr>
            ))}
            {(!data || data.top.length === 0) && (
              <tr className="border-t"><td className="px-3 py-2 text-muted-foreground" colSpan={5}>Aucune donnée</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
