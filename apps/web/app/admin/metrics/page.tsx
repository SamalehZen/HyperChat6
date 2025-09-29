"use client";
import { useState } from "react";
import { KPIHeader, type WindowSel } from "../_components/metrics";

export default function AdminMetricsPage() {
  const [windowSel, setWindowSel] = useState<WindowSel>('7j');
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Métriques & KPIs</h1>
      <KPIHeader windowSel={windowSel} onWindowChange={setWindowSel} />
    </div>
  );
}
