"use client";

import { useScroll, useTransform, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";

export interface AceternityTimelineEntry {
  title: string;
  content: React.ReactNode;
}

export function AceternityTimeline({
  data,
  title = "Progression",
  subtitle,
  className,
}: {
  data: AceternityTimelineEntry[];
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref, data?.length]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div ref={containerRef} className={cn("w-full font-sans px-0", className)}>
      <div className="mx-auto py-3 px-0">
        {title && (
          <h2 className="text-base md:text-lg mb-1 text-foreground/90">{title}</h2>
        )}
        {subtitle && (
          <p className="text-muted-foreground text-xs md:text-sm">{subtitle}</p>
        )}
      </div>

      <div ref={ref} className="relative mx-auto pb-3">
        {data.map((item, index) => (
          <div key={index} className="flex justify-start pt-6 md:pt-10 md:gap-6">
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-24 self-start max-w-xs lg:max-w-sm md:w-full">
              <div className="h-8 absolute left-3 md:left-3 w-8 rounded-full bg-background flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-muted border border-border" />
              </div>
              <h3 className="hidden md:block text-lg md:pl-16 md:text-2xl font-semibold text-muted-foreground">
                {item.title}
              </h3>
            </div>

            <div className="relative pl-16 pr-2 md:pl-4 w-full">
              <h3 className="md:hidden block text-base mb-2 text-left font-semibold text-muted-foreground">
                {item.title}
              </h3>
              {item.content}
            </div>
          </div>
        ))}
        <div
          style={{ height: height + "px" }}
          className="absolute md:left-6 left-6 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-border to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] "
        >
          <motion.div
            style={{ height: heightTransform, opacity: opacityTransform }}
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-purple-500 via-blue-500 to-transparent from-[0%] via-[10%] rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
