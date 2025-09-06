"use client";

import React, { useRef, useState, useCallback } from "react";
import { cn } from "../lib/utils";

type SpotlightContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  radius?: number;
  color?: string;
  colors?: string[];
  blurPx?: number;
};

export function SpotlightContainer({
  className,
  style,
  children,
  radius = 260,
  color = "hsl(var(--brand) / 0.95)",
  colors,
  blurPx = 0,
  ...rest
}: SpotlightContainerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  };

  const onMouseLeave = useCallback(() => {
    setPos(null);
  }, []);

  const gradientStops = () => {
    if (colors && colors.length >= 2) {
      const c0 = hexToRgb(colors[0]);
      const c1 = hexToRgb(colors[1]);
      const c2 = hexToRgb(colors[2] ?? colors[1]);
      return `rgba(${c0.r}, ${c0.g}, ${c0.b}, 0.95) 0%, rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.9) 30%, rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.85) 55%, transparent 85%`;
    }
    return `${color} 0%, ${color} 50%, transparent 85%`;
  };

  const overlayStyle: React.CSSProperties = pos
    ? {
        background: `radial-gradient(${radius}px circle at ${pos.x}px ${pos.y}px, ${gradientStops()})`,
        ...(blurPx > 0 ? { filter: `blur(${blurPx}px)` } : {}),
        transition: "background-position .05s linear, opacity .2s ease-out",
        willChange: "background",
      }
    : { opacity: 0, transition: "opacity .2s ease-out" };

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      style={style}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      {...rest}
    >
      <div className="absolute inset-0 z-0 pointer-events-none" style={overlayStyle} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default SpotlightContainer;
