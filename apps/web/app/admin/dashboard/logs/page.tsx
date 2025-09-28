"use client";

import { Button, Input } from '@repo/ui';

type Row = { ts: string; type: string; message: string };
const DATA: Row[] = Array.from({ length: 15 }).map((_, i) => ({
  ts: new Date(Date.now() - i * 3600000).toLocaleString(),
  type: i % 3 === 0 ? 'error' : i % 3 === 1 ? 'warn' : 'info',
  message: `Événement ${i + 1}`,
}));

export default function LogsPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Journaux</h1>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Filtre</label>
          <Input placeholder="Rechercher…" className="w-64" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Type</label>
          <select className="border-input bg-background text-foreground h-9 w-48 rounded-md border px-2 text-sm"><option>Tous</option><option>info</option><option>warn</option><option>error</option></select>
        </div>
        <Button>Appliquer</Button>
      </div>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Horodatage</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {DATA.map((r, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-3 py-2">{r.ts}</td>
                <td className="px-3 py-2">{r.type}</td>
                <td className="px-3 py-2">{r.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Page 1 / 2</span>
        <Button variant="secondary" size="sm">Précédent</Button>
        <Button variant="secondary" size="sm">Suivant</Button>
      </div>
    </div>
  );
}
