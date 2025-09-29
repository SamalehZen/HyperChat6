"use client";
import { useEffect, useState } from 'react';
import { Badge, Button } from '@repo/ui';
import { IconCheck, IconX } from '@repo/common/components';

type HealthRow = {
  key: string;
  provider: string;
  keyPresent: boolean;
  latencyAvgMs: number;
  latencyP95Ms: number;
  errorRatePct: number;
  status: 'ok' | 'warn' | 'down';
};

export function SystemHealthPanel({ windowSel }: { windowSel: '24h'|'7j'|'30j' }) {
  const [data, setData] = useState<{ window: '24h'|'7j'|'30j'; providers: HealthRow[]; overall: any } | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/admin/health?window=${windowSel}`, { cache: 'no-store' });
      if (res.ok) setData(await res.json());
    };
    load();
  }, [windowSel]);

  const colorBy = (s: HealthRow['status']) => s === 'ok' ? 'text-emerald-600' : s === 'warn' ? 'text-amber-600' : 'text-red-600';
  const badgeBy = (s: HealthRow['status']) => s === 'ok' ? 'bg-emerald-500/10 text-emerald-600' : s === 'warn' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600';

  return (
    <div className="mt-4 rounded-md border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Santé du système</h2>
        <div className="text-xs text-muted-foreground" aria-label="Période (Afrique/Djibouti)">Période: {windowSel}</div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="rounded border p-3">
          <div className="text-xs text-muted-foreground">Latence moyenne</div>
          <div className="text-xl font-semibold">{data?.overall?.latencyAvgMs ?? '-'} ms</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-xs text-muted-foreground">Latence p95</div>
          <div className="text-xl font-semibold">{data?.overall?.latencyP95Ms ?? '-'} ms</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-xs text-muted-foreground">Taux d’erreur (moyen)</div>
          <div className="text-xl font-semibold">{data?.overall?.errorRatePct ?? '-'}%</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm" aria-label="Santé par fournisseur">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Fournisseur</th>
              <th className="px-3 py-2 text-left font-medium">Clé</th>
              <th className="px-3 py-2 text-left font-medium">Lat. moyenne</th>
              <th className="px-3 py-2 text-left font-medium">Lat. p95</th>
              <th className="px-3 py-2 text-left font-medium">Erreurs</th>
              <th className="px-3 py-2 text-left font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {data?.providers?.map((p) => (
              <tr key={p.provider} className="border-t">
                <td className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span>{p.provider}</span>
                    <a href={`/admin/health/${encodeURIComponent(p.key)}?window=${windowSel}`} className="text-xs text-primary hover:underline" aria-label={`Voir détails ${p.provider}`}>Détails</a>
                  </div>
                </td>
                <td className="px-3 py-2">
                  {p.keyPresent ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs" aria-label="Clé présente"><IconCheck size={14} strokeWidth={2} /> OK</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600 text-xs" aria-label="Clé manquante"><IconX size={14} strokeWidth={2} /> Manquante</span>
                  )}
                </td>
                <td className="px-3 py-2">{p.latencyAvgMs} ms</td>
                <td className="px-3 py-2">{p.latencyP95Ms} ms</td>
                <td className="px-3 py-2">{p.errorRatePct}%</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs ${badgeBy(p.status)}`}>
                    {p.status === 'ok' ? 'OK' : p.status === 'warn' ? 'Attention' : 'Incident'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
