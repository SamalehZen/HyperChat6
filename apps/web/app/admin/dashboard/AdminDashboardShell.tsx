"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@repo/ui';
import { AdminSidebar, AdminSidebarMobile } from '@repo/common/components/admin/AdminSidebar';
import { ArrowUturnLeftIcon, Bars3Icon } from '@heroicons/react/24/outline';

export default function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <AdminSidebar collapsed={collapsed} onClose={() => setMobileOpen(false)} />
      <AdminSidebarMobile open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-2">
              <button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu">
                <Bars3Icon width={22} height={22} />
              </button>
              <div className="hidden lg:flex">
                <Button variant="secondary" onClick={() => setCollapsed((c) => !c)} aria-label="Basculer la sidebar">
                  {collapsed ? 'Ouvrir' : 'Réduire'}
                </Button>
              </div>
            </div>
            <Button asChild variant="secondary">
              <Link href="/chat" aria-label="Retour au chat" title="Retour au chat">
                <ArrowUturnLeftIcon width={18} height={18} />
                <span className="ml-2">Retour au chat</span>
              </Link>
            </Button>
          </div>
        </div>
        <main className="mx-auto w-full max-w-6xl p-6">{children}</main>
      </div>
    </div>
  );
}
