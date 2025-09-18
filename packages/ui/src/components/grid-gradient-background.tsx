'use client';
import React from 'react';
import { cn } from '../lib/utils';

type GridGradientBackgroundProps = {
  side?: 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
  variant?: 'new' | 'old' | 'hero';
};

export function GridGradientBackground({ side = 'left', className, style, variant = 'new' }: GridGradientBackgroundProps) {
  const radialAt = side === 'right' ? '100% 200px' : '0% 200px';

  const lightGrid = `
    linear-gradient(to right, #eaeaea 1px, transparent 1px),
    linear-gradient(to bottom, #eaeaea 1px, transparent 1px)
  `;
  const darkGrid = `
    linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
  `;

  const heroLightGrid = `
    linear-gradient(to right, hsl(var(--border) / 0.35) 1px, transparent 1px),
    linear-gradient(to bottom, hsl(var(--border) / 0.35) 1px, transparent 1px),
    linear-gradient(to right, hsl(var(--hard) / 0.18) 1px, transparent 1px),
    linear-gradient(to bottom, hsl(var(--hard) / 0.18) 1px, transparent 1px)
  `;

  const heroDarkGrid = `
    linear-gradient(to right, hsl(var(--border) / 0.12) 1px, transparent 1px),
    linear-gradient(to bottom, hsl(var(--border) / 0.12) 1px, transparent 1px),
    linear-gradient(to right, hsl(var(--hard) / 0.22) 1px, transparent 1px),
    linear-gradient(to bottom, hsl(var(--hard) / 0.22) 1px, transparent 1px)
  `;

  const lightBackgroundImage =
    variant === 'old'
      ? `${lightGrid},
         radial-gradient(circle 600px at 0% 200px, #d5c5ff, transparent),
         radial-gradient(circle 600px at 100% 200px, #d5c5ff, transparent)`
      : variant === 'hero'
      ? `${heroLightGrid}`
      : `${lightGrid},
         radial-gradient(circle 800px at ${radialAt}, #d5c5ff, transparent)`;

  const darkBackgroundImage =
    variant === 'old'
      ? `${darkGrid},
         radial-gradient(circle 600px at 0% 200px, rgba(139,92,246,0.25), transparent),
         radial-gradient(circle 600px at 100% 200px, rgba(139,92,246,0.25), transparent)`
      : variant === 'hero'
      ? `${heroDarkGrid}`
      : `${darkGrid},
         radial-gradient(circle 800px at ${radialAt}, rgba(139,92,246,0.25), transparent)`;

  const lightBackgroundSize = variant === 'old'
    ? '96px 64px, 96px 64px, 100% 100%, 100% 100%'
    : variant === 'hero'
    ? '64px 64px, 64px 64px, 256px 256px, 256px 256px'
    : '96px 64px, 96px 64px, 100% 100%';

  const darkBackgroundSize = lightBackgroundSize;

  return (
    <>
      <div
        className={cn('absolute inset-0 block dark:hidden pointer-events-none', className)}
        style={{
          backgroundImage: lightBackgroundImage,
          backgroundSize: lightBackgroundSize,
          ...style,
        }}
      />
      <div
        className={cn('absolute inset-0 hidden dark:block pointer-events-none', className)}
        style={{
          backgroundImage: darkBackgroundImage,
          backgroundSize: darkBackgroundSize,
          ...style,
        }}
      />
    </>
  );
}
