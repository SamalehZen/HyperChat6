"use client";
import { KPIHeader } from "../_components/metrics";

export default function AdminMetricsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Métriques & KPIs</h1>
      <KPIHeader />
    </div>
  );
}
