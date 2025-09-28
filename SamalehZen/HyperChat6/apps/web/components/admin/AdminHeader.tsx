"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminNavItems } from '@/lib/admin/nav';
import { Button } from '@repo/ui';
import { useState } from 'react';
import { CreateUserDialog } from './users/CreateUserDialog';

export default function AdminHeader() {
  const pathname = usePathname();
  const [openCreate, setOpenCreate] = useState(false);

  const crumbs = buildCrumbs(pathname);
  const isUsers = pathname.startsWith('/admin/users');

  return (
    <div className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <nav aria-label="Fil d'ariane">
          <ol className="flex items-center gap-1 text-sm text-muted-foreground">
            {crumbs.map((c, i) => (
              <li key={c.href} className="flex items-center gap-1">
                {i > 0 && <span className="opacity-60">/</span>}
                {i < crumbs.length - 1 ? (
                  <Link href={c.href} className="hover:text-foreground">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex items-center gap-2" aria-label="Actions de page">
          {isUsers && (
            <Button onClick={() => setOpenCreate(true)}>Créer un utilisateur</Button>
          )}
        </div>
      </div>
      <CreateUserDialog open={openCreate} onOpenChange={setOpenCreate} />
    </div>
  );
}

function buildCrumbs(pathname: string) {
  const base = { href: '/admin', label: 'Administration' };
  if (pathname === '/admin') return [base];
  const itemsByHref = new Map(adminNavItems.map(i => [i.href, i.label] as const));
  const segments = pathname.replace(/^\/?/, '/').split('/').filter(Boolean);
  const crumbs: { href: string; label: string }[] = [base];
  for (let i = 1; i < segments.length; i++) {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label = itemsByHref.get(href) || capitalize(segments[i]);
    crumbs.push({ href, label });
  }
  return crumbs;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
