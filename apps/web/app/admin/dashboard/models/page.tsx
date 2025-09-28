'use client';
import { useMemo, useState } from 'react';
import { Button } from '@repo/ui';

interface ModelRow {
  name: string;
  type: 'LLM' | 'Vision' | 'Speech';
  version: string;
  status: 'actif' | 'désactivé';
}

const MOCK_MODELS: ModelRow[] = [
  { name: 'gpt-4o-mini', type: 'LLM', version: '4.0', status: 'actif' },
  { name: 'gemini-1.5-pro', type: 'LLM', version: '1.5', status: 'actif' },
  { name: 'whisper-large', type: 'Speech', version: '3', status: 'actif' },
  { name: 'claude-3.5-sonnet', type: 'LLM', version: '3.5', status: 'désactivé' },
  { name: 'llava-1.6', type: 'Vision', version: '1.6', status: 'actif' },
];

const ALL = Array.from({ length: 37 }).flatMap(() => MOCK_MODELS);

export default function ModelsPage() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const totalPages = Math.ceil(ALL.length / perPage);
  const data = useMemo(() => {
    const start = (page - 1) * perPage;
    return ALL.slice(start, start + perPage);
  }, [page, perPage]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Modèles</h1>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full table-auto text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Nom du modèle</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Version</th>
              <th className="px-3 py-2 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m, i) => (
              <tr key={`${m.name}-${i}`} className="border-t">
                <td className="px-3 py-2">{m.name}</td>
                <td className="px-3 py-2">{m.type}</td>
                <td className="px-3 py-2">{m.version}</td>
                <td className="px-3 py-2 capitalize">{m.status}</td>
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
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
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
