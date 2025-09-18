'use client';
import React from 'react';
import { cn } from '../lib/utils';

/**
 * side controls the radial glow position:
 * - 'left': radial gradient on the left
 * - 'right': radial gradient on the right
 * - 'both': radial gradients on both sides (default)
 *
 * ui selects the visual preset (default: 'new'):
 * - 'classic': original light grid (#eaeaea) with existing dark mode
 * - 'new': updated light grid (#f0f0f0); dark mode identical to classic
 */
type GridGradientBackgroundProps = {
  side?: 'left' | 'right' | 'both';
  ui?: 'classic' | 'new';
  className?: string;
  style?: React.CSSProperties;
};

export function GridGradientBackground({ side = 'both', ui = 'new', className, style }: GridGradientBackgroundProps) {
  const isBoth = side === 'both';
  const circleSize = '800px';
  const lightGrid = ui === 'new' ? '#f0f0f0' : '#eaeaea';
  const lightRadial = '#d5c5ff';
  const darkGrid = 'rgba(255,255,255,0.06)';
  const darkRadial = 'rgba(139,92,246,0.25)';

  const lightBackgroundImage = isBoth
    ? `
            linear-gradient(to right, ${lightGrid} 1px, transparent 1px),
            linear-gradient(to bottom, ${lightGrid} 1px, transparent 1px),
            radial-gradient(circle ${circleSize} at 0% 200px, ${lightRadial}, transparent),
            radial-gradient(circle ${circleSize} at 100% 200px, ${lightRadial}, transparent)
          `
    : `
            linear-gradient(to right, ${lightGrid} 1px, transparent 1px),
            linear-gradient(to bottom, ${lightGrid} 1px, transparent 1px),
            radial-gradient(circle ${circleSize} at ${side === 'right' ? '100% 200px' : '0% 200px'}, ${lightRadial}, transparent)
          `;
  const darkBackgroundImage = isBoth
    ? `
            linear-gradient(to right, ${darkGrid} 1px, transparent 1px),
            linear-gradient(to bottom, ${darkGrid} 1px, transparent 1px),
            radial-gradient(circle ${circleSize} at 0% 200px, ${darkRadial}, transparent),
            radial-gradient(circle ${circleSize} at 100% 200px, ${darkRadial}, transparent)
          `
    : `
            linear-gradient(to right, ${darkGrid} 1px, transparent 1px),
            linear-gradient(to bottom, ${darkGrid} 1px, transparent 1px),
            radial-gradient(circle ${circleSize} at ${side === 'right' ? '100% 200px' : '0% 200px'}, ${darkRadial}, transparent)
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
