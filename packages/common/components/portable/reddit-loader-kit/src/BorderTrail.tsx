"use client"

import React from "react"
import { motion, useReducedMotion } from "framer-motion"

export type BorderTrailProps = {
  color?: string
  thickness?: number
  duration?: number
  rounded?: number
  inset?: number
  className?: string
  style?: React.CSSProperties
}

function join(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ")
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "")
  const bigint = parseInt(normalized.length === 3 ? normalized.replace(/(.)/g, "$1$1") : normalized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function BorderTrail({
  color = "#f97316",
  thickness = 2,
  duration = 1200,
  rounded = 12,
  inset = 0,
  className,
  style,
}: BorderTrailProps) {
  const reduceMotion = useReducedMotion()

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    pointerEvents: "none",
    top: inset,
    right: inset,
    bottom: inset,
    left: inset,
    borderRadius: rounded,
    overflow: "hidden",
    ...style,
  }

  if (reduceMotion) {
    const glow = hexToRgba(color, 0.35)
    const seg: React.CSSProperties = {
      backgroundColor: color,
      boxShadow: `0 0 ${Math.max(6, thickness * 3)}px ${glow}`,
    }

    return (
      <div aria-hidden className={join("absolute inset-0 pointer-events-none", className)} style={containerStyle}>
        <div
          aria-hidden
          className="absolute left-0 top-0 w-full"
          style={{ height: thickness, borderTopLeftRadius: rounded, borderTopRightRadius: rounded, ...seg }}
        />
        <div
          aria-hidden
          className="absolute right-0 top-0 h-full"
          style={{ width: thickness, borderTopRightRadius: rounded, borderBottomRightRadius: rounded, ...seg }}
        />
        <div
          aria-hidden
          className="absolute left-0 bottom-0 w-full"
          style={{ height: thickness, borderBottomLeftRadius: rounded, borderBottomRightRadius: rounded, ...seg }}
        />
        <div
          aria-hidden
          className="absolute left-0 top-0 h-full"
          style={{ width: thickness, borderTopLeftRadius: rounded, borderBottomLeftRadius: rounded, ...seg }}
        />
      </div>
    )
  }

  const dashLength = 0.25
  const gapLength = 1 - dashLength
  const glow = hexToRgba(color, 0.35)

  return (
    <div aria-hidden className={join("absolute inset-0 pointer-events-none", className)} style={containerStyle}>
      <motion.svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="presentation"
        aria-hidden
        style={{ display: "block", willChange: "transform" }}
      >
        <motion.rect
          x={0.5}
          y={0.5}
          width={99}
          height={99}
          rx={Math.max(0, rounded - inset)}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 1, pathOffset: 0, strokeDasharray: `${dashLength} ${gapLength}`, strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: [0, 1] }}
          transition={{ duration: duration / 1000, ease: "linear", repeat: Infinity }}
          style={{ filter: `drop-shadow(0 0 ${Math.max(6, thickness * 3)}px ${glow})` }}
        />
      </motion.svg>
    </div>
  )
}

export default BorderTrail
