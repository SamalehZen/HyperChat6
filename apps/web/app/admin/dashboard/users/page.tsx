'use client';
import { useMemo, useState } from 'react';
import { Button, Input } from '@repo/ui';

interface UserRow {
  id: string;
  email: string;
  role: 'user' | 'admin';
  status: 'actif' | 'désactivé';
  createdAt: string;
}

const MOCK_USERS: UserRow[] = Array.from({ length: 57 }).map((_, i) => ({
  id: String(1000 + i),
  email: `user${i + 1}@exemple.com`,
  role: i % 10 === 0 ? 'admin' : 'user',
  status: i % 7 === 0 ? 'désactivé' : 'actif',
  createdAt: new Date(Date.now() - i * 86400000).toLocaleDateString('fr-FR'),
}));

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const totalPages = Math.ceil(MOCK_USERS.length / perPage);
  const data = useMemo(() => {
    const start = (page - 1) * perPage;
    return MOCK_USERS.slice(start, start + perPage);
  }, [page, perPage]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Utilisateurs</h1>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full table-auto text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Rôle</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2 font-medium">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.id}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2 capitalize">{u.role}</td>
                <td className="px-3 py-2 capitalize">{u.status}</td>
                <td className="px-3 py-2">{u.createdAt}</td>
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
