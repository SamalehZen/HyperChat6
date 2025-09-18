import React from 'react';
import { cn } from '../lib/utils';
import Link from 'next/link';

export type PortfolioGalleryProps = {
  title?: string;
  archiveButton?: { text: string; href: string };
  className?: string;
};

export const PortfolioGallery: React.FC<PortfolioGalleryProps> = ({
  title = 'Parcourir ma galerie',
  archiveButton = { text: 'Voir la galerie', href: '/work' },
  className,
}) => {
  return (
    <section className={cn('relative min-h-screen w-full rounded-xl border border-border/40 bg-card/60 p-6 shadow-sm backdrop-blur', className)}>
      <div className="flex w-full items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {archiveButton?.href && (
          <Link
            href={archiveButton.href}
            className="inline-flex items-center rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {archiveButton.text}
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="aspect-[4/3] w-full rounded-lg bg-muted" />
        <div className="aspect-[4/3] w-full rounded-lg bg-muted" />
        <div className="aspect-[4/3] w-full rounded-lg bg-muted" />
        <div className="aspect-[4/3] w-full rounded-lg bg-muted" />
        <div className="aspect-[4/3] w-full rounded-lg bg-muted" />
        <div className="aspect-[4/3] w-full rounded-lg bg-muted" />
      </div>
    </section>
  );
};

export default PortfolioGallery;
