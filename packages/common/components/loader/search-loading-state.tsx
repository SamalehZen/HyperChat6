'use client';

import React, { useMemo } from 'react';
import { motion, type Transition } from 'framer-motion';
import { cn } from '@repo/ui';

/* ------------------------------ */
/* Utils                          */
/* ------------------------------ */

type BorderTrailProps = {
  className?: string;
  size?: number;
  transition?: Transition;
  delay?: number;
  onAnimationComplete?: () => void;
  style?: React.CSSProperties;
};

export function BorderTrail({
  className,
  size = 60,
  transition,
  delay,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  const BASE_TRANSITION: Transition = {
    repeat: Infinity,
    duration: 6,
    ease: 'linear',
  };

  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={cn(
          'absolute aspect-square rounded-full',
          'bg-gradient-to-r from-violet-500 via-pink-500 to-orange-500',
          className
        )}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          ...style,
        }}
        animate={{ offsetDistance: ['0%', '100%'] }}
        transition={{ ...(transition ?? BASE_TRANSITION), delay }}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}

/* ------------------------------ */
/* Card components                */
/* ------------------------------ */

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-card text-card-foreground flex flex-col gap-6 rounded-3xl border py-6 shadow-sm relative overflow-hidden',
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-6', className)} {...props} />;
}

/* ------------------------------ */
/* Text shimmer                   */
/* ------------------------------ */

interface LocalTextShimmerProps {
  children: string;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

export function LocalTextShimmer({ children, as: Component = 'p', className, duration = 2, spread = 2 }: LocalTextShimmerProps) {
  const MotionComponent = motion.create(Component as keyof React.JSX.IntrinsicElements);

  const dynamicSpread = useMemo(() => children.length * spread, [children, spread]);

  return (
    <MotionComponent
      className={cn(
        'relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent',
        '[--base-color:#a1a1aa] [--base-gradient-color:#000]',
        '[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]',
        'dark:[--base-color:#71717a] dark:[--base-gradient-color:#ffffff] dark:[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]',
        className
      )}
      initial={{ backgroundPosition: '100% center' }}
      animate={{ backgroundPosition: '0% center' }}
      transition={{ repeat: Infinity, duration, ease: 'linear' }}
      style={{
        '--spread': `${dynamicSpread}px`,
        backgroundImage: `var(--bg), linear-gradient(var(--base-color), var(--base-color))`,
      } as React.CSSProperties}
    >
      {children}
    </MotionComponent>
  );
}

/* ------------------------------ */
/* Search Loading State            */
/* ------------------------------ */

export type SearchLoadingStateProps = {
  icon: React.ReactNode;
  text: string;
  color: 'red' | 'green' | 'orange' | 'violet' | 'gray' | 'blue';
  className?: string;
};

export const SearchLoadingState = ({
  icon,
  text,
  color,
  className,
}: SearchLoadingStateProps) => {
  const colorVariants = {
    red: { background: 'bg-red-50 dark:bg-red-950' },
    green: { background: 'bg-green-50 dark:bg-green-950' },
    orange: { background: 'bg-orange-50 dark:bg-orange-950' },
    violet: { background: 'bg-violet-50 dark:bg-violet-950' },
    gray: { background: 'bg-neutral-50 dark:bg-neutral-950' },
    blue: { background: 'bg-blue-50 dark:bg-blue-950' },
  } as const;

  const variant = colorVariants[color];

  return (
    <Card className={cn('w-full h-[100px] my-4 shadow-none', className)}>
      {/* Large BorderTrail autour du Card */}
      <BorderTrail size={80} />

      <CardContent>
        <div className="relative flex items-center gap-3">
          {/* Mini loader autour de l'icône */}
          <div className={cn('relative h-10 w-10 rounded-full flex items-center justify-center', variant.background)}>
            <BorderTrail size={30} className="opacity-80" />
            <div className="h-5 w-5 flex items-center justify-center text-white">
              {icon}
            </div>
          </div>

          <div className="space-y-2 flex-1">
            <LocalTextShimmer className="text-base font-medium" duration={2}>
              {text}
            </LocalTextShimmer>
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse"
                  style={{
                    width: `${Math.random() * 40 + 20}px`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchLoadingState;
