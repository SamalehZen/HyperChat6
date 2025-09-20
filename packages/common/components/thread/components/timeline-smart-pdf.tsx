"use client";

import { Timeline, TimelineItem } from "@repo/ui";
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

  return (
    <Timeline title="Progression">
      {timeline.map((item) => (
        <TimelineItem
          key={item.id}
          title={item.title}
          description={item.desc}
          thumbnail={<img src={item.image} alt="" className="h-full w-full object-contain" />}
          right={item.status === "COMPLETED" ? "Terminé" : item.status === "PENDING" ? "En cours" : "En attente"}
          status={item.status === "QUEUED" ? "pending" : (item.status?.toLowerCase() as any)}
        />
      ))}
    </Timeline>
  );
};
