"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, Button } from '@repo/ui';
import { useAdminUIStore } from '@repo/common/store';
import {
  UserGroupIcon,
  RectangleStackIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChevronDoubleLeftIcon,
} from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';

const NAV_ITEMS = [
  { href: '/admin/dashboard/users', label: 'Utilisateurs', Icon: UserGroupIcon },
  { href: '/admin/dashboard/models', label: 'Modèles', Icon: RectangleStackIcon },
  { href: '/admin/dashboard/logs', label: 'Logs', Icon: DocumentTextIcon },
  { href: '/admin/dashboard/settings', label: 'Paramètres', Icon: Cog6ToothIcon },
] as const;

type AdminSidebarProps = {
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
};

export function AdminSidebar({ variant = 'desktop', onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const isMobile = variant === 'mobile';
  const isAdminSidebarOpen = useAdminUIStore(s => s.isAdminSidebarOpen);
  const setIsAdminSidebarOpen = useAdminUIStore(s => s.setIsAdminSidebarOpen);
  const [hovered, setHovered] = useState(false);

  const expanded = isMobile ? true : isAdminSidebarOpen || hovered;
  const width = expanded ? 300 : 60;

  const items = useMemo(() => NAV_ITEMS, []);

  return (
    <motion.aside
      initial={false}
      animate={{ width }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className={cn(
        'relative z-40 flex h-[100dvh] flex-col border-r bg-background',
        isMobile ? 'w-[300px]' : 'hidden lg:flex'
      )}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      role="navigation"
      aria-label="Navigation admin"
    >
      <div className="flex flex-col gap-2 p-2">
        <div className={cn('flex items-center justify-between', expanded ? 'px-1' : 'px-0')}></div>
        <nav>
          <ul role="list" className="flex flex-col gap-1">
            {items.map(({ href, label, Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href} role="listitem">
                  <Link
                    href={href}
                    onClick={() => onNavigate?.()}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm outline-none transition-colors',
                      active
                        ? 'bg-accent/60 text-foreground'
                        : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className={cn('size-5 shrink-0', active && 'text-foreground')} />
                    {expanded && <span className="truncate">{label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {!isMobile && (
        <div className="mt-auto p-2">
          <Button
            variant="ghost"
            size={expanded ? 'sm' : 'icon'}
            className={cn('w-full justify-center')}
            onClick={() => setIsAdminSidebarOpen(prev => !prev)}
            aria-label={expanded ? 'Réduire le menu' : 'Étendre le menu'}
            tooltip={expanded ? 'Réduire' : 'Étendre'}
            tooltipSide="right"
          >
            <ChevronDoubleLeftIcon className={cn('size-5 transition-transform', !expanded && 'rotate-180')} />
            {expanded && <span className="ml-2">Réduire</span>}
          </Button>
        </div>
      )}
    </motion.aside>
  );
}
