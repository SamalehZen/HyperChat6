'use client';
import React from 'react';
import { cn } from '../lib/utils';

/**
 * side controls the radial glow position:
 * - 'left': radial gradient on the left
 * - 'right': radial gradient on the right
 * - 'both': radial gradients on both sides (default)
 */
type GridGradientBackgroundProps = {
  side?: 'left' | 'right' | 'both';
  className?: string;
  style?: React.CSSProperties;
};

export function GridGradientBackground({ side = 'both', className, style }: GridGradientBackgroundProps) {
  const isBoth = side === 'both';
  const lightBackgroundImage = isBoth
    ? `
            linear-gradient(to right, #eaeaea 1px, transparent 1px),
            linear-gradient(to bottom, #eaeaea 1px, transparent 1px),
            radial-gradient(circle 800px at 0% 200px, #d5c5ff, transparent),
            radial-gradient(circle 800px at 100% 200px, #d5c5ff, transparent)
          `
    : `
            linear-gradient(to right, #eaeaea 1px, transparent 1px),
            linear-gradient(to bottom, #eaeaea 1px, transparent 1px),
            radial-gradient(circle 800px at ${side === 'right' ? '100% 200px' : '0% 200px'}, #d5c5ff, transparent)
          `;
  const darkBackgroundImage = isBoth
    ? `
            linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px),
            radial-gradient(circle 800px at 0% 200px, rgba(139,92,246,0.25), transparent),
            radial-gradient(circle 800px at 100% 200px, rgba(139,92,246,0.25), transparent)
          `
    : `
            linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px),
            radial-gradient(circle 800px at ${side === 'right' ? '100% 200px' : '0% 200px'}, rgba(139,92,246,0.25), transparent)
          `;
  const backgroundSize = isBoth
    ? '96px 64px, 96px 64px, 100% 100%, 100% 100%'
    : '96px 64px, 96px 64px, 100% 100%';

  return (
    <>
      {/* Clair */}
      <div
        className={cn('absolute inset-0 block dark:hidden', className)}
        style={{
          backgroundImage: lightBackgroundImage,
          backgroundSize,
          ...style,
        }}
      />
      {/* Sombre */}
      <div
        className={cn('absolute inset-0 hidden dark:block', className)}
        style={{
          backgroundImage: darkBackgroundImage,
          backgroundSize,
          ...style,
        }}
      />
    </>
  );
}
