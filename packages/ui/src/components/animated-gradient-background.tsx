"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

export type AnimatedGradientBackgroundProps = {
  startingGap?: number;
  Breathing?: boolean;
  gradientColors?: string[];
  gradientStops?: number[];
  animationSpeed?: number;
  breathingRange?: number;
  containerStyle?: React.CSSProperties;
  containerClassName?: string;
  topOffset?: number;
};

export const AnimatedGradientBackground: React.FC<AnimatedGradientBackgroundProps> = ({
  startingGap = 125,
  Breathing = true,
  gradientColors = ["#0A0A0A", "#2979FF", "#FF80AB", "#FF6D00", "#FFD600", "#00E676", "#3D5AFE"],
  gradientStops = [35, 50, 60, 70, 80, 90, 100],
  animationSpeed = 0.02,
  breathingRange = 5,
  containerStyle = {},
  containerClassName = "",
  topOffset = 0,
}) => {
  const bgRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;

    const clampedStops = (stops: number[]) =>
      stops.map((s) => Math.max(0, Math.min(100, s)));

    const buildBackground = (t: number) => {
      const phaseBase = startingGap * 0.01;
      const animatedStops = gradientStops.map((stop, i) => {
        const phase = t + i * phaseBase;
        const delta = Breathing ? Math.sin(phase) * breathingRange : 0;
        return Math.round(Math.max(0, Math.min(100, stop + delta)));
      });

      const stops = clampedStops(animatedStops);
      const parts = gradientColors.map((c, i) => `${c} ${stops[Math.min(i, stops.length - 1)]}%`);
      const yPos = `calc(50% + ${topOffset}px)`;
      const gradient = `radial-gradient(100% 100% at 50% ${yPos}, ${parts.join(", ")})`;

      el.style.backgroundImage = gradient;
      el.style.backgroundRepeat = "no-repeat";
      el.style.backgroundSize = "cover";
    };

    const loop = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const t = ((now - startRef.current) / 16.6667) * animationSpeed;
      buildBackground(t);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      startRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    Breathing,
    startingGap,
    animationSpeed,
    breathingRange,
    topOffset,
    // keep stable dependencies for arrays
    JSON.stringify(gradientColors),
    JSON.stringify(gradientStops),
  ]);

  return (
    <motion.div
      ref={bgRef}
      className={cn("w-full h-full", containerClassName)}
      style={{
        ...containerStyle,
        willChange: "background-image",
        filter: "blur(0px)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    />
  );
};

export default AnimatedGradientBackground;
