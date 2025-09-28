"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, cn } from '@repo/ui';
import { AdminSidebar } from '@repo/common/components';
import { ArrowUturnLeftIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (mobileOpen) document.body.classList.add('overflow-hidden');
    else document.body.classList.remove('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, [mobileOpen]);

  return (
    <div className="relative flex h-[100dvh] w-full">
      <div className="hidden lg:flex">
        <AdminSidebar variant="desktop" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden inline-flex items-center justify-center rounded-md border p-2 text-sm hover:bg-accent"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Bars3Icon className="size-5" />
            </button>
          </div>
          <div className="flex-1" />
          <Link href="/chat" aria-label="Retour au chat" title="Retour au chat">
            <Button variant="secondary" className="inline-flex items-center gap-2">
              <ArrowUturnLeftIcon className="size-4" />
              <span>Retour au chat</span>
            </Button>
          </Link>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4">{children}</main>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="panel"
              className="fixed inset-y-0 left-0 z-50"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="relative h-full w-[300px] bg-background">
                <button
                  className="absolute right-2 top-2 inline-flex items-center justify-center rounded-md border p-2 text-sm hover:bg-accent"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Fermer le menu"
                >
                  <XMarkIcon className="size-5" />
                </button>
                <AdminSidebar variant="mobile" onNavigate={() => setMobileOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
