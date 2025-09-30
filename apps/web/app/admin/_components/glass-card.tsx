"use client";
import { cn } from "@repo/ui";
import { ReactNode } from "react";

type GlassVariant = "primary" | "secondary" | "panel";
type GlowColor = "success" | "warning" | "error" | "info" | "brand" | "accent" | "none";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: GlassVariant;
  glow?: GlowColor;
  glowOnHover?: boolean;
  lift?: boolean;
  onClick?: () => void;
}

export function GlassCard({ 
  children, 
  className, 
  variant = "primary", 
  glow = "none",
  glowOnHover = false,
  lift = false,
  onClick 
}: GlassCardProps) {
  const variantClass = {
    primary: "glass-card",
    secondary: "glass-card-secondary",
    panel: "glass-panel",
  }[variant];

  const glowClass = glow !== "none" ? `glow-${glow}` : "";
  const glowHoverClass = glowOnHover && glow !== "none" ? `glow-hover-${glow}` : "";
  const liftClass = lift ? "card-lift-hover" : "";

  return (
    <div 
      className={cn(
        "rounded-md transition-all duration-300", 
        variantClass,
        glowClass,
        glowHoverClass,
        liftClass,
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}