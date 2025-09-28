"use client";

import { Button, Input } from '@repo/ui';

type Row = { name: string; type: string; version: string; status: 'Actif' | 'Déprécié' };
const DATA: Row[] = [
  { name: 'gpt-4o-mini', type: 'chat', version: '2025-06-01', status: 'Actif' },
  { name: 'claude-3.7', type: 'chat', version: '2025-05-20', status: 'Actif' },
  { name: 'bert-embed', type: 'embed', version: '2.1.0', status: 'Déprécié' },
];

export default function ModelsPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Modèles</h1>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Recherche</label>
          <Input placeholder="Nom du modèle…" className="w-64" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Type</label>
          <select className="border-input bg-background text-foreground h-9 w-48 rounded-md border px-2 text-sm"><option>Tous</option><option>chat</option><option>embed</option></select>
        </div>
        <Button>Appliquer</Button>
      </div>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Nom</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">Version</th>
              <th className="px-3 py-2 text-left font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {DATA.map((r) => (
              <tr key={r.name} className="border-t">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.type}</td>
                <td className="px-3 py-2">{r.version}</td>
                <td className="px-3 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Page 1 / 1</span>
        <Button variant="secondary" size="sm">Précédent</Button>
        <Button variant="secondary" size="sm">Suivant</Button>
      </div>
    </div>
  );
}
