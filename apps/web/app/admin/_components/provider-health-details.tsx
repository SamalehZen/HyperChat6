"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export type WindowSel = '24h' | '7j' | '30j';

export function ProviderHealthDetails({ providerKey, initialWindow }: { providerKey: string; initialWindow?: WindowSel }) {
  const [windowSel, setWindowSel] = useState<WindowSel>(initialWindow || '7j');
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await fetch(`/api/admin/health/provider/${encodeURIComponent(providerKey)}?window=${windowSel}`, { cache: 'no-store' });
      if (!mounted) return;
      if (res.ok) setData(await res.json());
    };
    load();
    return () => { mounted = false; };
  }, [providerKey, windowSel]);

  const bucketData = data?.latency?.buckets || [];
  const statusPie = useMemo(() => {
    const s = data?.errors?.byStatus || {};
    return [
      { name: 'Complétés', value: s.COMPLETED || 0 },
      { name: 'Erreurs', value: s.ERROR || 0 },
      { name: 'Abandons', value: s.ABORTED || 0 },
    ];
  }, [data]);

  const errorCodes = useMemo(() => {
    const codes = data?.errors?.byCode || {};
    return Object.entries(codes)
      .map(([code, count]) => ({ code, count: Number(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data]);

  const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#0ea5e9', '#6366f1', '#84cc16'];

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Détails fournisseur</h1>
          <p className="text-sm text-muted-foreground">Fournisseur: <span className="font-medium">{providerKey}</span> • Période: {windowSel} (Afrique/Djibouti)</p>
        </div>
        <div className="flex items-center gap-1 rounded-md border p-0.5" aria-label="Période (Afrique/Djibouti)">
          {(['24h','7j','30j'] as const).map((w) => (
            <button key={w} onClick={() => setWindowSel(w)} className={`px-2 py-1 text-xs rounded ${windowSel===w ? 'bg-muted font-medium' : 'hover:bg-muted/50'}`}>{w}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-md border p-4" aria-label="Histogramme de latence">
          <h2 className="mb-2 text-lg font-semibold">Histogramme de latence</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bucketData}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [v, 'Requêtes']} labelFormatter={(l) => `Latence: ${l}`} />
                <Bar dataKey="count" name="Requêtes" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">p50: {data?.latency?.p50} ms • p90: {data?.latency?.p90} ms • p95: {data?.latency?.p95} ms • p99: {data?.latency?.p99} ms</div>
        </div>
        <div className="rounded-md border p-4" aria-label="Répartition des statuts">
          <h2 className="mb-2 text-lg font-semibold">Répartition des statuts</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip formatter={(v: any, name: any) => [`${v}`, name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(p) => `${p.name} (${p.value})`}>
                  {statusPie.map((entry: any, idx: number) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 rounded-md border p-2">
            <div className="text-sm font-medium">Codes d’erreur (Top 10)</div>
            <ul className="mt-1 space-y-1 text-sm">
              {errorCodes.length === 0 && <li className="text-muted-foreground">Aucun code d’erreur</li>}
              {errorCodes.map((e: any) => (
                <li key={e.code} className="flex items-center justify-between">
                  <span className="truncate" title={e.code}>{e.code}</span>
                  <span className="tabular-nums">{e.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-md border p-4" aria-label="Séries temporelles">
        <h2 className="mb-2 text-lg font-semibold">Séries temporelles</h2>
        <div className="text-sm text-muted-foreground">Complétés / Erreurs / Abandons</div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(data?.series?.dates || []).map((d: string, i: number) => ({
              date: d,
              completed: data?.series?.completed?.[i] ?? 0,
              errors: data?.series?.errors?.[i] ?? 0,
              aborted: data?.series?.aborted?.[i] ?? 0,
            }))}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any, name: any) => [v, name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="completed" name="Complétés" fill="#22c55e" />
              <Bar dataKey="errors" name="Erreurs" fill="#ef4444" />
              <Bar dataKey="aborted" name="Abandons" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4">
        <Link href={`/admin/dashboard?window=${windowSel}`} className="text-sm text-primary hover:underline" aria-label="Retour au tableau de bord">← Retour au tableau de bord</Link>
      </div>
    </div>
  );
}
