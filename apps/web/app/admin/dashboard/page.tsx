"use client";
import { useState } from "react";
import { KPIHeader, type WindowSel } from "../_components/metrics";
import { OnlinePanel } from "../_components/online-panel";
import { RecentEventsPanel } from "../_components/recent-events-panel";
import { SystemHealthPanel } from "../_components/system-health";
import { UsageCharts } from "../_components/usage-charts";

export default function AdminDashboardPage() {
  const [windowSel, setWindowSel] = useState<WindowSel>('7j');
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Tableau de bord</h1>
      <KPIHeader windowSel={windowSel} onWindowChange={setWindowSel} />
      <UsageCharts windowSel={windowSel} />
      <SystemHealthPanel windowSel={windowSel} />
      <OnlinePanel />
      <RecentEventsPanel defaultLimit={10} showFilters={false} />
    </div>
  );
}
