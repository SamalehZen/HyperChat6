"use client";

import { StepStatus } from "@repo/common/components";
import { Step, ThreadItem } from "@repo/shared/types";
import { motion } from "framer-motion";
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
    <div className="mb-3 rounded-lg border p-3">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <p className="mb-2 text-sm font-semibold">Progression</p>
      </motion.div>
      <div className="relative">
        <div className="absolute left-[11px] top-0 h-full w-px bg-border" aria-hidden />
        <div className="flex flex-col gap-3">
          {timeline.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              className="relative flex w-full items-start gap-3"
            >
              <div className="z-10 mt-0.5 shrink-0">
                <StepStatus status={item.status === "QUEUED" ? "PENDING" : (item.status as any)} />
              </div>
              <div className="flex min-w-0 flex-1 items-start gap-3 rounded-md p-2 hover:bg-muted/50">
                <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-background">
                  <img src={item.image} alt="" className="h-full w-full object-contain" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">{item.desc}</p>
                </div>
                <div className="shrink-0 text-xs font-medium">
                  {item.status === "COMPLETED" ? "Terminé" : item.status === "PENDING" ? "En cours" : "En attente"}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
