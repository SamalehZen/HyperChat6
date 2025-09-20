"use client";

import { AutoTimeline } from "@repo/ui";
import { Step, ThreadItem } from "@repo/shared/types";
import React, { useMemo } from "react";

export const TimelineSmartPdf = ({ steps, threadItem }: { steps: Step[]; threadItem: ThreadItem }) => {
  const items = useMemo(() => {
    const findSub = (key: string) =>
      steps.find(s => s.steps && key in (s.steps || {}))?.steps?.[key]?.status || undefined;

    const prepare = findSub("prepare") || findSub("extract");
    const extract = findSub("extract");
    const ocr = findSub("ocr");
    const convert = findSub("convert");

    const mapToUi = (s?: string): "queued" | "pending" | "completed" =>
      s === "COMPLETED" ? "completed" : s === "PENDING" ? "pending" : "queued";

    const importStatus = ((): "queued" | "pending" | "completed" => {
      if (prepare === "COMPLETED" || extract === "COMPLETED") return "completed";
      if (prepare === "PENDING" || extract === "PENDING") return "pending";
      return "queued";
    })();

    const ocrStatus = mapToUi(ocr);
    const convertStatus = mapToUi(convert);

    return [
      {
        title: "Import du document",
        description: "Fichier détecté et préparé",
        status: importStatus,
        icon: <img src="/icons/image.png" alt="" className="h-full w-full object-contain" />,
      },
      {
        title: "OCR & analyse",
        description: "Détection des tableaux et cellules",
        status: ocrStatus,
        icon: <img src="/icons/llmchat.png" alt="" className="h-full w-full object-contain" />,
      },
      {
        title: "Conversion Excel",
        description: "Génération du tableau final",
        status: convertStatus,
        icon: <img src="/icons/llmchat-accent.svg" alt="" className="h-full w-full object-contain" />,
      },
    ];
  }, [steps]);

  return <AutoTimeline items={items as any} />;
};
