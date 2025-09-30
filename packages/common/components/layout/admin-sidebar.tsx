"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Flex, cn } from "@repo/ui";
import { useAppStore } from "@repo/common/store";
import { useTheme } from "next-themes";
import {
  IconArrowBarLeft,
  IconArrowBarRight,
  IconLayoutDashboard,
  IconUsers,
  IconFileText,
  IconChartBar,
  IconShieldCheck,
  IconSettings,
  IconMessageCircleFilled,
  IconSun,
  IconMoon,
  IconLogout,
} from "../icons";

export const AdminSidebar = () => {
  const pathname = usePathname();

  const isSidebarOpen = useAppStore((s) => s.isSidebarOpen);
  const setIsSidebarOpen = useAppStore((s) => s.setIsSidebarOpen);

  const items: Array<{
    label: string;
    href: string;
    icon: (props: { size?: number; strokeWidth?: number; className?: string }) => JSX.Element;
    match: (p: string) => boolean;
  }> = [
    { label: "Utilisateurs", href: "/admin/users", icon: IconUsers, match: (p) => p.startsWith("/admin/users") },
    { label: "Tableau de bord", href: "/admin/dashboard", icon: IconLayoutDashboard, match: (p) => p.startsWith("/admin/dashboard") },
    { label: "Journal d’activité", href: "/admin/logs", icon: IconFileText, match: (p) => p.startsWith("/admin/logs") },
    { label: "Métriques & KPIs", href: "/admin/metrics", icon: IconChartBar, match: (p) => p.startsWith("/admin/metrics") },
    { label: "Accès aux modèles", href: "/admin/access", icon: IconShieldCheck, match: (p) => p.startsWith("/admin/access") },
    { label: "Paramètres", href: "/admin/settings", icon: IconSettings, match: (p) => p.startsWith("/admin/settings") },
  ];

  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    if (typeof window !== 'undefined') window.location.href = '/sign-in';
  };

  return (
    <div
      className={cn(
        "glass-sidebar relative bottom-0 left-0 top-0 z-[50] flex h-[100dvh] flex-shrink-0 flex-col py-3 transition-all duration-300 shadow-lg",
        isSidebarOpen ? "w-[280px]" : "w-[60px]"
      )}
    >
      <Flex direction="col" className="w-full flex-1 overflow-hidden">
        <Flex direction="row" className={cn("w-full px-3 items-center mb-2", !isSidebarOpen && "justify-center px-0")} gap="sm" justify="start">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsSidebarOpen(prev => !prev)}
            aria-label={isSidebarOpen ? "Réduire le panneau" : "Étendre le panneau"}
            tooltip={isSidebarOpen ? "Réduire" : "Étendre"}
            tooltipSide="right"
            className="transition-all duration-200 hover:bg-white/60 dark:hover:bg-black/40 rounded-lg"
          >
            {isSidebarOpen ? (
              <IconArrowBarLeft size={18} strokeWidth={2} />
            ) : (
              <IconArrowBarRight size={18} strokeWidth={2} />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Basculer en mode clair' : 'Basculer en mode sombre'}
            tooltip={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            tooltipSide="right"
            className="transition-all duration-200 hover:bg-white/60 dark:hover:bg-black/40 rounded-lg"
          >
            {theme === 'dark' ? <IconSun size={18} strokeWidth={2} /> : <IconMoon size={18} strokeWidth={2} />}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={logout}
            aria-label="Se déconnecter"
            tooltip="Se déconnecter"
            tooltipSide="right"
            className="transition-all duration-200 hover:bg-white/60 dark:hover:bg-black/40 rounded-lg"
          >
            <IconLogout size={18} strokeWidth={2} />
          </Button>
        </Flex>

        <nav className={cn("w-full flex-1 overflow-y-auto", isSidebarOpen ? "px-3" : "px-2")}
          aria-label="Navigation administrateur"
        >
          <ul className="flex flex-col gap-1.5">
            {items.map((it) => {
              const active = it.match(pathname);
              return (
                <li key={it.href}>
                  <Link href={it.href} className="block">
                    <div
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 outline-none transition-all duration-200",
                        active 
                          ? "bg-white/70 dark:bg-black/40 text-foreground font-medium shadow-sm" 
                          : "text-muted-foreground hover:bg-white/50 dark:hover:bg-black/30 hover:text-foreground",
                        !isSidebarOpen && "justify-center px-2"
                      )}
                      aria-current={active ? "page" : undefined}
                      aria-label={isSidebarOpen ? undefined : it.label}
                      title={it.label}
                    >
                      <it.icon size={18} strokeWidth={2} className="shrink-0" />
                      {isSidebarOpen && <span className="text-sm">{it.label}</span>}
                      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand rounded-r-full" />}
                    </div>
                  </Link>
                </li>
              );
            })}
            <li key="/chat-return" className="mt-2 pt-2 border-t border-white/20 dark:border-black/30">
              <Link href="/chat" className="block">
                <div
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 outline-none transition-all duration-200",
                    "text-muted-foreground hover:bg-white/50 dark:hover:bg-black/30 hover:text-foreground",
                    !isSidebarOpen && "justify-center px-2"
                  )}
                  aria-label={isSidebarOpen ? undefined : "Retour au chat"}
                  title="Retour au chat"
                >
                  <IconMessageCircleFilled size={18} strokeWidth={2} className="shrink-0" />
                  {isSidebarOpen && <span className="text-sm">Retour au chat</span>}
                </div>
              </Link>
            </li>
          </ul>
        </nav>


      </Flex>
    </div>
  );
};
