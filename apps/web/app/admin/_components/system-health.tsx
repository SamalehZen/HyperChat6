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
    <div className="mt-6 glass-panel rounded-lg p-6 transition-all duration-300">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Santé du système</h2>
        <div className="glass-card-secondary px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground" aria-label="Période (Afrique/Djibouti)">Période: {windowSel}</div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="glass-card rounded-lg p-4 card-lift-hover glow-hover-success transition-all duration-300">
          <div className="text-sm font-medium text-muted-foreground mb-2">Latence moyenne</div>
          <div className="text-2xl font-bold text-foreground">{data?.overall?.latencyAvgMs ?? '-'} <span className="text-base text-muted-foreground">ms</span></div>
        </div>
        <div className="glass-card rounded-lg p-4 card-lift-hover glow-hover-info transition-all duration-300">
          <div className="text-sm font-medium text-muted-foreground mb-2">Latence p95</div>
          <div className="text-2xl font-bold text-foreground">{data?.overall?.latencyP95Ms ?? '-'} <span className="text-base text-muted-foreground">ms</span></div>
        </div>
        <div className="glass-card rounded-lg p-4 card-lift-hover glow-hover-warning transition-all duration-300">
          <div className="text-sm font-medium text-muted-foreground mb-2">Taux d'erreur (moyen)</div>
          <div className="text-2xl font-bold text-foreground">{data?.overall?.errorRatePct ?? '-'}<span className="text-base text-muted-foreground">%</span></div>
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-lg shadow-sm">
        <table className="w-full text-sm" aria-label="Santé par fournisseur">
          <thead className="glass-card-secondary border-b border-border/40">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Fournisseur</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Clé</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Lat. moyenne</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Lat. p95</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Erreurs</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Statut</th>
            </tr>
          </thead>
          <tbody>
            {data?.providers?.map((p, idx) => (
              <tr key={p.provider} className={`border-t border-border/30 transition-colors duration-200 ${idx % 2 === 0 ? 'bg-white/20 dark:bg-black/10' : 'bg-transparent'} hover:bg-white/40 dark:hover:bg-black/20`}>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{p.provider}</span>
                    <a href={`/admin/health/${encodeURIComponent(p.key)}?window=${windowSel}`} className="text-xs font-medium text-brand hover:underline transition-colors" aria-label={`Voir détails ${p.provider}`}>Détails</a>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.keyPresent ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-medium" aria-label="Clé présente"><IconCheck size={16} strokeWidth={2.5} /> OK</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 text-xs font-medium" aria-label="Clé manquante"><IconX size={16} strokeWidth={2.5} /> Manquante</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{p.latencyAvgMs} ms</td>
                <td className="px-4 py-3 font-medium text-foreground">{p.latencyP95Ms} ms</td>
                <td className="px-4 py-3 font-medium text-foreground">{p.errorRatePct}%</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${badgeBy(p.status)} ${p.status === 'ok' ? 'status-glow-ok' : p.status === 'warn' ? 'status-glow-warn' : 'status-glow-error'}`}>
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