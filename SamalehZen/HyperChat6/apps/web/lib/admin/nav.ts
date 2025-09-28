import type React from 'react';
import type { IconProps } from '@repo/common/components';
import {
  IconChartBar,
  IconUser,
  IconSettings,
  IconBook,
  IconAdjustments,
  IconTerminal,
  IconMarkdown,
  IconPencil,
} from '@repo/common/components';

export type AdminNavItem = {
  key:
    | 'dashboard'
    | 'users'
    | 'analytics'
    | 'prompts'
    | 'knowledge'
    | 'moderation'
    | 'models'
    | 'logs'
    | 'settings';
  label: string;
  href: string;
  icon: React.ComponentType<IconProps>;
};

export const adminNavItems: AdminNavItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', href: '/admin', icon: IconChartBar },
  { key: 'users', label: 'Utilisateurs', href: '/admin/users', icon: IconUser },
  { key: 'analytics', label: 'Analytique', href: '/admin/analytics', icon: IconChartBar },
  { key: 'prompts', label: 'Prompts', href: '/admin/prompts', icon: IconPencil },
  { key: 'knowledge', label: 'Connaissances', href: '/admin/knowledge', icon: IconBook },
  { key: 'moderation', label: 'Modération', href: '/admin/moderation', icon: IconAdjustments },
  { key: 'models', label: 'Modèles', href: '/admin/models', icon: IconTerminal },
  { key: 'logs', label: 'Journaux', href: '/admin/logs', icon: IconMarkdown },
  { key: 'settings', label: 'Paramètres', href: '/admin/settings', icon: IconSettings },
];
