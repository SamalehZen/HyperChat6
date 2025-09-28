'use client';
import { useMemo, useState } from 'react';
import { Button, Input } from '@repo/ui';

interface LogRow {
  ts: string;
  type: 'info' | 'warn' | 'error';
  message: string;
}

const TYPES: LogRow['type'][] = ['info', 'warn', 'error'];
const MOCK_LOGS: LogRow[] = Array.from({ length: 113 }).map((_, i) => ({
  ts: new Date(Date.now() - i * 60_000).toLocaleString('fr-FR'),
  type: TYPES[i % TYPES.length],
  message: `Événement #${i + 1} — tout est normal (mock)`,
}));

export default function LogsPage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return MOCK_LOGS.filter(l => l.message.toLowerCase().includes(q) || l.type.includes(q));
  }, [query]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const data = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [page, perPage, filtered]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Logs</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filtrer..."
            value={query}
            onChange={(e) => { setPage(1); setQuery(e.target.value); }}
            className="w-[240px]"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full table-auto text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Horodatage</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {data.map((l, i) => (
              <tr key={`${l.ts}-${i}`} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{l.ts}</td>
                <td className="px-3 py-2 capitalize">{l.type}</td>
                <td className="px-3 py-2">{l.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span>Lignes par page</span>
          <select
            className="rounded-md border bg-background px-2 py-1"
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Précédent
          </Button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <Button
              key={i}
              variant={i + 1 === page ? 'default' : 'ghost'}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </Button>
          ))}
          <Button
            variant="secondary"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
