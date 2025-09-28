"use client";

import { UserTable, type UserRow } from '@/components/admin/users/UserTable';
import { UserRowActions } from '@/components/admin/users/UserRowActions';

export default function UsersPageClient() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Utilisateurs</h1>
      <p className="mb-4 text-sm text-muted-foreground">Recherchez, filtrez, triez et parcourez les comptes.</p>
      <UserTable renderActions={(u: UserRow, { reload }) => (
        <UserRowActions user={u} onChanged={reload} />
      )} />
    </div>
  );
}
