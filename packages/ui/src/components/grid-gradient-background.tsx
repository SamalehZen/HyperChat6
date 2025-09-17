'use client';
import React from 'react';
import { cn } from '../lib/utils';

type GridGradientBackgroundProps = {
  side?: 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
};

export function GridGradientBackground({ side = 'left', className, style }: GridGradientBackgroundProps) {
  const radialAt = side === 'right' ? '100% 200px' : '0% 200px';

  return (
    <>
      {/* Clair */}
      <div
        className={cn('absolute inset-0 block dark:hidden', className)}
        style={{
          backgroundImage: `
            linear-gradient(to right, #eaeaea 1px, transparent 1px),
            linear-gradient(to bottom, #eaeaea 1px, transparent 1px),
            radial-gradient(circle 800px at ${radialAt}, #d5c5ff, transparent)
          `,
          backgroundSize: '96px 64px, 96px 64px, 100% 100%',
          ...style,
        }}
      />
      {/* Sombre */}
      <div
        className={cn('absolute inset-0 hidden dark:block', className)}
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px),
            radial-gradient(circle 800px at ${radialAt}, rgba(139,92,246,0.25), transparent)
          `,
          backgroundSize: '96px 64px, 96px 64px, 100% 100%',
          ...style,
        }}
      />
    </>
  );
}
