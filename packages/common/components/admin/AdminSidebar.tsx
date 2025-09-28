"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, cn } from '@repo/ui';
import { useState } from 'react';
import {
  UserGroupIcon,
  RectangleStackIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

export function AdminSidebar({ collapsed: collapsedProp = false, onClose }: { collapsed?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const collapsed = collapsedProp && !hovered;

  const items = [
    { href: '/admin/dashboard/users', label: 'Utilisateurs', icon: UserGroupIcon },
    { href: '/admin/dashboard/models', label: 'Modèles', icon: RectangleStackIcon },
    { href: '/admin/dashboard/logs', label: 'Journaux', icon: DocumentTextIcon },
    { href: '/admin/dashboard/settings', label: 'Paramètres', icon: Cog6ToothIcon },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 60 : 300 }}
      className="hidden lg:flex shrink-0 flex-col border-r bg-background"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Navigation admin"
    >
      <div className="p-3 border-b">
        <Button asChild variant="secondary" className="w-full" aria-label="Retour au chat">
          <Link href="/chat">Retour au chat</Link>
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon as any;
            return (
              <li key={item.href} role="listitem">
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring',
                    active && 'bg-secondary text-foreground'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="text-muted-foreground" width={18} height={18} />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -4 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-2 border-t">
        <Button variant="secondary" className="w-full" onClick={onClose}>Fermer</Button>
      </div>
    </motion.aside>
  );
}

export function AdminSidebarMobile({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            className="fixed inset-y-0 left-0 z-50 w-[300px] bg-background border-r"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            role="dialog"
            aria-modal="true"
          >
            <AdminSidebar collapsed={false} onClose={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
