'use client';
import React from 'react';
import { cn } from '../lib/utils';
import { MeshShaderBackground } from './mesh-shader-background';
import { ShaderAnimationBackground } from './shader-animation-background';
import { NeuralNoiseBackground } from './neural-noise-background';
import { RedLinesFogBackground } from './red-lines-fog-background';
import { ShaderLinesBackground } from './shader-lines-background';
import { UnicornBackground } from './unicorn-background';

type GridGradientBackgroundProps = {
  side?: 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
  variant?: 'new' | 'old' | 'mesh' | 'shader' | 'neural' | 'redlines' | 'shaderlines' | 'unicorn';
  unicornProjectId?: string;
};

export function GridGradientBackground({ side = 'left', className, style, variant = 'new', unicornProjectId }: GridGradientBackgroundProps) {
  if (variant === 'mesh') {
    return <MeshShaderBackground />;
  }
  if (variant === 'shader') {
    return <ShaderAnimationBackground />;
  }
  if (variant === 'neural') {
    return <NeuralNoiseBackground />;
  }
  if (variant === 'redlines') {
    return <RedLinesFogBackground />;
  }
  if (variant === 'shaderlines') {
    return <ShaderLinesBackground />;
  }
  if (variant === 'unicorn') {
    return <UnicornBackground projectId={unicornProjectId || '4gZ4it90JCXyP8TH783D'} />;
  }

  const haloColor = 'rgba(139,92,246,0.25)';
  const radialAt = side === 'right' ? '100% 200px' : '0% 200px';

  const darkGrid = `
    linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
  `;

  const gridBackgroundSize = '96px 64px, 96px 64px';

  const haloBackgroundImage =
    variant === 'old'
      ? `radial-gradient(circle 600px at 0% 200px, ${haloColor}, transparent),
         radial-gradient(circle 600px at 100% 200px, ${haloColor}, transparent)`
      : `radial-gradient(circle 800px at ${radialAt}, ${haloColor}, transparent)`;

  return (
    <div
      className={cn('absolute inset-0 hidden dark:block pointer-events-none', className)}
      style={style}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: haloBackgroundImage,
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% 100%',
        }}
      />

      {variant === 'old' ? (
        <>
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: darkGrid,
              backgroundSize: gridBackgroundSize,
              maskImage:
                'radial-gradient(circle 600px at 0% 200px, #000 40%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage:
                'radial-gradient(circle 600px at 0% 200px, #000 40%, rgba(0,0,0,0) 100%)',
            }}
          />
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: darkGrid,
              backgroundSize: gridBackgroundSize,
              maskImage:
                'radial-gradient(circle 600px at 100% 200px, #000 40%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage:
                'radial-gradient(circle 600px at 100% 200px, #000 40%, rgba(0,0,0,0) 100%)',
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: darkGrid,
            backgroundSize: gridBackgroundSize,
            maskImage: `radial-gradient(circle 800px at ${radialAt}, #000 40%, rgba(0,0,0,0) 100%)`,
            WebkitMaskImage: `radial-gradient(circle 800px at ${radialAt}, #000 40%, rgba(0,0,0,0) 100%)`,
          }}
        />
      )}
    </div>
  );
}
