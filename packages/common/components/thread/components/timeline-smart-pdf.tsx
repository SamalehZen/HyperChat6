"use client";

import { AceternityTimeline } from "@repo/ui";
import { Step, ThreadItem } from "@repo/shared/types";
import React, { useMemo } from "react";

export const TimelineSmartPdf = ({ steps, threadItem }: { steps: Step[]; threadItem: ThreadItem }) => {
  const timeline = useMemo(() => {
    const findSub = (key: string) =>
      steps.find(s => s.steps && key in (s.steps || {}))?.steps?.[key]?.status || undefined;

    const prepare = findSub("prepare") || findSub("extract");
    const extract = findSub("extract");
    const ocr = findSub("ocr");
    const convert = findSub("convert");

    const importStatus = ((): "PENDING" | "COMPLETED" | "QUEUED" => {
      if (prepare === "COMPLETED" || extract === "COMPLETED") return "COMPLETED";
      if (prepare === "PENDING" || extract === "PENDING") return "PENDING";
      return "QUEUED";
    })();

    const ocrStatus = ((): "PENDING" | "COMPLETED" | "QUEUED" => {
      if (ocr === "COMPLETED") return "COMPLETED";
      if (ocr === "PENDING") return "PENDING";
      return "QUEUED";
    })();

    const convertStatus = ((): "PENDING" | "COMPLETED" | "QUEUED" => {
      if (convert === "COMPLETED") return "COMPLETED";
      if (convert === "PENDING") return "PENDING";
      return "QUEUED";
    })();

    return [
      { id: 0, title: "Import du document", desc: "Fichier détecté et préparé", status: importStatus, image: "/icons/image.png" },
      { id: 1, title: "OCR & analyse", desc: "Détection des tableaux et cellules", status: ocrStatus, image: "/icons/llmchat.png" },
      { id: 2, title: "Conversion Excel", desc: "Génération du tableau final", status: convertStatus, image: "/icons/llmchat-accent.svg" },
    ];
  }, [steps]);

  const data = timeline.map((item) => ({
    title: item.title,
    content: (
      <div className="rounded-md border p-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{item.desc}</span>
          <span>
            {item.status === "COMPLETED" ? "Terminé" : item.status === "PENDING" ? "En cours" : "En attente"}
          </span>
        </div>
      </div>
    ),
  }));

  return (
    <AceternityTimeline data={data} title="Progression" className="px-0" />
  );
};
