"use client";
import { MeshGradient } from "@paper-design/shaders-react";
import type { ReactNode } from "react";

export function MeshShaderBackground({ children }: { children?: ReactNode }) {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0" aria-hidden="true">
      <svg className="absolute inset-0 w-0 h-0">
        <defs>
          <filter id="glass-effect" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
            <feColorMatrix type="matrix" values="1 0 0 0 0.02  0 1 0 0 0.02  0 0 1 0 0.05  0 0 0 0.9 0" result="tint" />
          </filter>
          <filter id="gooey-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="gooey" />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>
      <div className="absolute inset-0" style={{ backgroundColor: "#000000" }}>
        <MeshGradient
          className="absolute inset-0 w-full h-full"
          colors={["#000000", "#8b5cf6", "#ffffff", "#1e1b4b", "#4c1d95"]}
          speed={0.3}
        />
      </div>
      <MeshGradient
        className="absolute inset-0 w-full h-full opacity-60"
        colors={["#000000", "#ffffff", "#8b5cf6", "#000000"]}
        speed={0.2}
        wireframe
      />
      {children}
    </div>
  );
}
