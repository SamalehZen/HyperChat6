"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

export type TimelineStatus = "queued" | "pending" | "completed";

export type TimelineItemProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  thumbnail?: React.ReactNode;
  right?: React.ReactNode;
  status?: TimelineStatus;
  className?: string;
};

export const TimelineItem: React.FC<TimelineItemProps> = ({
  title,
  description,
  thumbnail,
  right,
  status = "queued",
  className,
}) => {
  const dotClass = cn(
    "size-3 rounded-full border",
    status === "completed" && "bg-emerald-500 border-emerald-600",
    status === "pending" && "bg-blue-500 border-blue-600 animate-pulse",
    status === "queued" && "bg-muted-foreground/30 border-muted-foreground/40"
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("relative flex w-full items-start gap-3", className)}
    >
      <div className="z-10 mt-0.5 shrink-0">
        <div className={dotClass} aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 items-start gap-3 rounded-md p-2 hover:bg-muted/50">
        {thumbnail && (
          <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-background">
            {thumbnail}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{title}</p>
          </div>
          {description && (
            <p className="text-muted-foreground truncate text-xs">{description}</p>
          )}
        </div>
        {right && <div className="shrink-0 text-xs font-medium">{right}</div>}
      </div>
    </motion.div>
  );
};

export type TimelineProps = {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
};

export const Timeline: React.FC<TimelineProps> = ({ children, className, title }) => {
  return (
    <div className={cn("mb-3 rounded-lg border p-3", className)}>
      {title && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <p className="mb-2 text-sm font-semibold">{title}</p>
        </motion.div>
      )}
      <div className="relative">
        <div className="absolute left-[11px] top-0 h-full w-px bg-border" aria-hidden />
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </div>
  );
};
