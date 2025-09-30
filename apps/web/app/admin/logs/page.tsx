"use client";
import { RecentEventsPanel } from "../_components/recent-events-panel";

export default function AdminLogsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <h1 className="mb-6 text-3xl font-bold text-foreground">Journal d'activité</h1>
      <RecentEventsPanel defaultLimit={25} showFilters={true} />
    </div>
  );
}