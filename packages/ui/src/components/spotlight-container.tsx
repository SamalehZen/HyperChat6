"use client";

import React, { useRef, useState, useCallback } from "react";
import { cn } from "../lib/utils";

type SpotlightContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  radius?: number;
  color?: string;
};

export function SpotlightContainer({
  className,
  style,
  children,
  radius = 260,
  color = "hsl(var(--brand) / 0.12)",
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

  const onMouseLeave = useCallback(() => {
    setPos(null);
  }, []);

  const overlayStyle: React.CSSProperties = pos
    ? {
        background: `radial-gradient(${radius}px circle at ${pos.x}px ${pos.y}px, ${color}, transparent 45%)`,
      }
    : { opacity: 0 };

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
