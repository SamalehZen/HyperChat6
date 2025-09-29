"use client";
import { KPIHeader } from "../_components/metrics";
import { OnlinePanel } from "../_components/online-panel";
import { RecentEventsPanel } from "../_components/recent-events-panel";

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Tableau de bord</h1>
      <KPIHeader />
      <OnlinePanel />
      <RecentEventsPanel defaultLimit={10} showFilters={false} />
    </div>
  );
}
