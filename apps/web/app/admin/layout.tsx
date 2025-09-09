import { readAdminSessionFromCookies } from '@/lib/admin-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import React from 'react';

export const runtime = 'nodejs';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await readAdminSessionFromCookies();
  if (!session) redirect('/admin/login');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/users" className="hover:underline">Users</Link>
            <Link href="/admin/audit" className="hover:underline">Audit</Link>
            <span className="ml-auto" />
            <form action="/api/admin/auth/logout" method="POST">
              <input type="hidden" name="csrf" value={session.csrf} />
              <button className="text-red-600 hover:underline" type="submit">Logout</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
