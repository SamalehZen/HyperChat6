"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export function ModeDetails({ modeKey, initialWindow }: { modeKey: string; initialWindow?: '24h'|'7j'|'30j' }) {
  const [windowSel, setWindowSel] = useState<'24h'|'7j'|'30j'>(initialWindow || '7j');
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await fetch(`/api/admin/metrics/mode/${encodeURIComponent(modeKey)}?window=${windowSel}`, { cache: 'no-store' });
      if (!mounted) return;
      if (res.ok) setData(await res.json());
    };
    load();
    return () => { mounted = false; };
  }, [modeKey, windowSel]);

  const buckets = data?.latency?.buckets || [];
  const correlation = data?.correlation?.buckets || [];

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Détails mode</h1>
          <p className="text-sm text-muted-foreground">Mode: <span className="font-medium">{modeKey}</span> • Période: {windowSel} (Afrique/Djibouti)</p>
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
              <BarChart data={buckets}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [v, 'Requêtes']} labelFormatter={(l) => `Latence: ${l}`} />
                <Bar dataKey="count" name="Requêtes" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">p50: {data?.latency?.p50} ms • p90: {data?.latency?.p90} ms • p95: {data?.latency?.p95} ms • p99: {data?.latency?.p99} ms</div>
        </div>
        <div className="rounded-md border p-4" aria-label="Corrélation latence × statut">
          <h2 className="mb-2 text-lg font-semibold">Corrélation latence × statut</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={correlation}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey={["statusCounts","COMPLETED"].join('.')} name="Complétés" fill="#22c55e" />
                <Bar dataKey={["statusCounts","ERROR"].join('.')} name="Erreurs" fill="#ef4444" />
                <Bar dataKey={["statusCounts","ABORTED"].join('.')} name="Abandons" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
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
