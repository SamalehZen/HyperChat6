"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Flex, cn } from "@repo/ui";
import { useAppStore } from "@repo/common/store";
import {
  IconArrowBarLeft,
  IconArrowBarRight,
  IconArrowLeft,
  IconLayoutDashboard,
  IconUsers,
  IconFileText,
  IconChartBar,
  IconShieldCheck,
  IconSettings,
} from "../icons";

export const AdminSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
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

  return (
    <div
      className={cn(
        "relative bottom-0 left-0 top-0 z-[50] flex h-[100dvh] flex-shrink-0 flex-col border-r py-2 transition-all duration-200",
        isSidebarOpen ? "w-[280px] border-border/70 bg-background shadow-xs" : "w-[60px] border-border/30"
      )}
    >
      <Flex direction="col" className="w-full flex-1 overflow-hidden">
        <Flex direction="col" className={cn("w-full px-2", !isSidebarOpen && "items-center px-0")} gap="sm">
          <Button
            size={isSidebarOpen ? "sm" : "icon-sm"}
            variant="default"
            rounded="lg"
            onClick={() => router.push("/chat")}
            aria-label="Retour au chat"
            tooltip={isSidebarOpen ? undefined : "Retour au chat"}
            tooltipSide="right"
            className={cn("relative w-full justify-center")}
          >
            <IconArrowLeft size={16} strokeWidth={2} className={cn(isSidebarOpen && "absolute left-2") as string} />
            {isSidebarOpen && "Retour au chat"}
          </Button>
        </Flex>

        <nav className={cn("mt-3 w-full flex-1 overflow-y-auto", isSidebarOpen ? "px-2" : "px-1")}
          aria-label="Navigation administrateur"
        >
          <ul className="flex flex-col gap-1">
            {items.map((it) => {
              const active = it.match(pathname);
              return (
                <li key={it.href}>
                  <Link href={it.href} className="block">
                    <div
                      className={cn(
                        "hover:bg-quaternary/60 focus-visible:ring-ring/40 flex items-center gap-3 rounded-md px-2 py-1.5 outline-none transition-colors",
                        active ? "bg-quaternary/80 text-foreground" : "text-muted-foreground",
                        !isSidebarOpen && "justify-center px-1"
                      )}
                      aria-current={active ? "page" : undefined}
                      aria-label={isSidebarOpen ? undefined : it.label}
                      title={it.label}
                    >
                      <it.icon size={16} strokeWidth={2} className="shrink-0" />
                      {isSidebarOpen && <span className="text-sm">{it.label}</span>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Flex className="mt-auto w-full p-2" justify={isSidebarOpen ? "between" : "center"}>
          {isSidebarOpen ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label="Fermer le panneau latéral"
              tooltip="Fermer le panneau"
              tooltipSide="right"
            >
              <IconArrowBarLeft size={16} strokeWidth={2} /> Fermer
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label="Ouvrir le panneau latéral"
              tooltip="Ouvrir le panneau"
              tooltipSide="right"
            >
              <IconArrowBarRight size={16} strokeWidth={2} />
            </Button>
          )}
        </Flex>
      </Flex>
    </div>
  );
};
