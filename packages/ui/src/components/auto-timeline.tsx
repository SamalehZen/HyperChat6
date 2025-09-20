"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { cn } from "../lib/utils";
import { motion, useMotionValue } from "framer-motion";
import { animate } from "framer-motion";

export type AutoTimelineStatus = "queued" | "pending" | "completed";

export type AutoTimelineItem = {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  status: AutoTimelineStatus;
};

export function AutoTimeline({
  items,
  className,
  title = "Progression",
  autoSync = true,
}: {
  items: AutoTimelineItem[];
  className?: string;
  title?: React.ReactNode;
  autoSync?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progress = useMotionValue(0);

  const activeIndex = useMemo(() => {
    const pending = items.findIndex((i) => i.status === "pending");
    if (pending >= 0) return pending;
    const lastCompleted = [...items].reverse().findIndex((i) => i.status === "completed");
    if (lastCompleted >= 0) return items.length - 1 - lastCompleted;
    return 0;
  }, [items]);

  useEffect(() => {
    if (!autoSync) return;
    const track = trackRef.current;
    const targetRow = rowRefs.current[activeIndex];
    if (!track || !targetRow) return;

    const trackTop = track.getBoundingClientRect().top + (track.parentElement?.scrollTop || 0);
    const marker = targetRow.querySelector("[data-marker]") as HTMLElement | null;
    const markerEl = marker || targetRow;
    const markerTop = markerEl.getBoundingClientRect().top + (track.parentElement?.scrollTop || 0);
    const targetHeight = Math.max(0, markerTop - trackTop + (markerEl.offsetHeight / 2));

    const controls = animate(progress, targetHeight, { duration: 0.6, ease: "easeInOut" });

    // Scroll the row into view in the nearest scrollable ancestor
    const scrollable = getScrollableAncestor(targetRow);
    if (scrollable) {
      // slight delay to align with the animation start
      setTimeout(() => {
        targetRow.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }, 120);
    }

    return () => controls.stop();
  }, [activeIndex, items, autoSync]);

  return (
    <div className={cn("w-full font-sans", className)}>
      {title && (
        <div className="mb-2">
          <p className="text-sm font-semibold text-foreground/90">{title}</p>
        </div>
      )}
      <div className="relative">
        {/* Vertical track */}
        <div ref={trackRef} className="absolute left-[11px] top-0 bottom-0 w-[2px] bg-border" aria-hidden>
          <motion.div
            style={{ height: progress }}
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-b from-blue-500 via-violet-500 to-purple-500 rounded-full"
          />
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item, idx) => (
            <div key={idx} ref={(el) => (rowRefs.current[idx] = el)} className="relative flex w-full items-start gap-3">
              <div className="z-10 mt-0.5 shrink-0" data-marker>
                <div
                  className={cn(
                    "size-3 rounded-full border",
                    item.status === "completed" && "bg-emerald-500 border-emerald-600",
                    item.status === "pending" && "bg-blue-500 border-blue-600 animate-pulse",
                    item.status === "queued" && "bg-muted-foreground/30 border-muted-foreground/40"
                  )}
                />
              </div>
              <div className="flex min-w-0 flex-1 items-start gap-3 rounded-md p-2 hover:bg-muted/50">
                {item.icon && (
                  <div className="relative h-10 w-10 overflow-hidden rounded-md border bg-background">
                    {item.icon}
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                  </div>
                  {item.description && (
                    <p className="text-muted-foreground truncate text-xs">{item.description}</p>
                  )}
                </div>
                <div className="shrink-0 text-[11px] font-medium text-muted-foreground">
                  {item.status === "completed" ? "Terminé" : item.status === "pending" ? "En cours" : "En attente"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let parent: HTMLElement | null = el?.parentElement || null;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return parent;
    parent = parent.parentElement;
  }
  return null;
}
