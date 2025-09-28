"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminNavItems } from '@/lib/admin/nav';
import { Button, cn } from '@repo/ui';

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex w-[240px] shrink-0 flex-col border-r bg-background"
      role="navigation"
      aria-label="Navigation admin"
    >
      <div className="p-4 border-b">
        <Button asChild className="w-full" variant="default">
          <Link href="/chat">Retour au chat</Link>
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {adminNavItems.map((item) => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring',
                    active && 'bg-secondary text-foreground'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={16} strokeWidth={2} className="text-muted-foreground" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
