"use client";
import { motion } from "framer-motion";
import { cn } from "@repo/ui";
import { ReactNode } from "react";

type GlassVariant = "primary" | "secondary" | "panel";
type GlowColor = "success" | "warning" | "error" | "info" | "brand" | "accent" | "none";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  variant?: GlassVariant;
  glow?: GlowColor;
  glowOnHover?: boolean;
  lift?: boolean;
  onClick?: () => void;
  delay?: number;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  tall?: boolean;
}

export function BentoCard({ 
  children, 
  className, 
  variant = "primary", 
  glow = "none",
  glowOnHover = false,
  lift = false,
  onClick,
  delay = 0,
  size = "md",
  tall = false,
}: BentoCardProps) {
  const variantClass = {
    primary: "glass-card",
    secondary: "glass-card-secondary",
    panel: "glass-panel",
  }[variant];

  const glowClass = glow !== "none" ? `glow-${glow}` : "";
  const glowHoverClass = glowOnHover && glow !== "none" ? `glow-hover-${glow}` : "";
  const liftClass = lift ? "card-lift-hover" : "";
  const sizeClass = size ? `bento-card-${size}` : "bento-card";
  const tallClass = tall ? "bento-card-tall" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay,
        ease: [0.16, 1, 0.3, 1]
      }}
      className={cn(
        "rounded-lg transition-all duration-300", 
        variantClass,
        glowClass,
        glowHoverClass,
        liftClass,
        sizeClass,
        tallClass,
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      whileHover={lift ? { y: -4, transition: { duration: 0.2 } } : undefined}
    >
      {children}
    </motion.div>
  );
}

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn("bento-grid w-full", className)}>
      {children}
    </div>
  );
}