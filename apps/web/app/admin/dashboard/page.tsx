"use client";
import { useState } from "react";
import { KPIHeader, type WindowSel } from "../_components/metrics";
import { OnlinePanel } from "../_components/online-panel";
import { RecentEventsPanel } from "../_components/recent-events-panel";
import { SystemHealthPanel } from "../_components/system-health";
import { UsageCharts } from "../_components/usage-charts";
import { CostCharts } from "../_components/cost-charts";
import { TopUsersTokensCost } from "../_components/top-users-tokens-cost";
import { BentoGrid } from "../_components/bento-card";
import { motion } from "framer-motion";

export default function AdminDashboardPage() {
  const [windowSel, setWindowSel] = useState<WindowSel>('7j');
  
  return (
    <div className="mx-auto w-full max-w-[1600px] p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="mb-8 text-4xl font-bold text-foreground bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
          Tableau de bord
        </h1>
      </motion.div>

      <KPIHeader windowSel={windowSel} onWindowChange={setWindowSel} />

      <BentoGrid className="mt-8">
        <UsageCharts windowSel={windowSel} />
        <CostCharts windowSel={windowSel} />
      </BentoGrid>

      <BentoGrid className="mt-6">
        <TopUsersTokensCost windowSel={windowSel} />
        <SystemHealthPanel windowSel={windowSel} />
      </BentoGrid>

      <BentoGrid className="mt-6">
        <OnlinePanel />
        <RecentEventsPanel defaultLimit={10} showFilters={false} />
      </BentoGrid>
    </div>
  );
}