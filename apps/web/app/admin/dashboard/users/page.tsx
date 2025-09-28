"use client";

import { Button, Input, Select } from '@repo/ui';

type Row = { id: string; email: string; role: 'admin' | 'user'; status: 'Actif' | 'Suspendu'; createdAt: string };
const DATA: Row[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `user-${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: i % 5 === 0 ? 'admin' : 'user',
  status: i % 4 === 0 ? 'Suspendu' : 'Actif',
  createdAt: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
}));

export default function UsersPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Utilisateurs</h1>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Recherche</label>
          <Input placeholder="Email…" className="w-64" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Rôle</label>
          <Select className="w-48"><option>Tous</option><option>admin</option><option>user</option></Select>
        </div>
        <Button>Appliquer</Button>
      </div>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">ID</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Rôle</th>
              <th className="px-3 py-2 text-left font-medium">Statut</th>
              <th className="px-3 py-2 text-left font-medium">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {DATA.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.id}</td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{r.role}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Page 1 / 2</span>
        <Button variant="secondary" size="sm">Précédent</Button>
        <Button variant="secondary" size="sm">Suivant</Button>
        <div className="flex-1" />
        <Select className="w-24"><option>10</option><option>20</option><option>50</option></Select>
      </div>
    </div>
  );
}
