'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@repo/ui';

export type SearchLoadingStateProps = {
  icon: React.ReactNode;
  text: string;
  color: 'red' | 'green' | 'orange' | 'violet' | 'gray' | 'blue';
  className?: string;
};

const colorStops: Record<SearchLoadingStateProps['color'], string[]> = {
  red: ['#ef4444', '#f87171', '#dc2626'],
  green: ['#22c55e', '#86efac', '#16a34a'],
  orange: ['#f97316', '#fb923c', '#f59e0b'],
  violet: ['#8b5cf6', '#a78bfa', '#7c3aed'],
  gray: ['#6b7280', '#9ca3af', '#4b5563'],
  blue: ['#3b82f6', '#60a5fa', '#1d4ed8'],
};

function getConicGradient(color: SearchLoadingStateProps['color']) {
  const [c1, c2, c3] = colorStops[color];
  return `conic-gradient(from 0deg, ${c1} 0deg, ${c2} 120deg, ${c3} 240deg, ${c1} 360deg)`;
}

const BorderTrail = ({
  color,
  radiusClass = 'rounded-3xl',
  children,
}: {
  color: SearchLoadingStateProps['color'];
  radiusClass?: string;
  children: React.ReactNode;
}) => {
  const gradient = getConicGradient(color);
  return (
    <div className={cn('relative', radiusClass)}>
      <motion.div
        aria-hidden
        className={cn('pointer-events-none absolute inset-0', radiusClass)}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        style={{
          background: gradient,
          padding: '1px',
          borderRadius: 'inherit',
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor' as any,
          maskComposite: 'exclude',
          mask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)'
        }}
      />
      <div className={cn('relative', radiusClass)}>{children}</div>
    </div>
  );
};

const LocalTextShimmer = ({
  children,
  className,
  duration = 1.0,
}: {
  children: string;
  className?: string;
  duration?: number;
}) => {
  return (
    <motion.span
      className={cn(
        'relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent',
        '[--base-color:hsl(var(--muted-foreground)/50)] [--base-gradient-color:hsl(var(--foreground))]',
        '[--bg:linear-gradient(90deg,#0000_calc(50%-24px),var(--base-gradient-color),#0000_calc(50%+24px))] [background-repeat:no-repeat,padding-box]',
        'dark:[--base-color:hsl(var(--muted-foreground)/50)] dark:[--base-gradient-color:hsl(var(--foreground))]',
        className
      )}
      initial={{ backgroundPosition: '100% center' }}
      animate={{ backgroundPosition: '0% center' }}
      transition={{ repeat: Infinity, duration, ease: 'linear' }}
      style={{ backgroundImage: `var(--bg), linear-gradient(var(--base-color), var(--base-color))` }}
    >
      {children}
    </motion.span>
  );
};

export const SearchLoadingState = ({ icon, text, color, className }: SearchLoadingStateProps) => {
  return (
    <BorderTrail color={color} radiusClass={cn('rounded-3xl', className)}>
      <div
        role="status"
        aria-busy="true"
        className={cn(
          'bg-background/95 text-foreground',
          'border border-border',
          'rounded-3xl',
          'px-3 py-2'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center">
            {icon}
          </div>
          <div className="text-sm font-medium">
            <LocalTextShimmer duration={1.1}>{text}</LocalTextShimmer>
          </div>
        </div>
      </div>
    </BorderTrail>
  );
};

export default SearchLoadingState;
