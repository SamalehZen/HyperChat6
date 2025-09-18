import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export interface PortfolioGalleryProps {
  title?: string;
  images?: Array<{ src: string; alt: string; title?: string }>;
  className?: string;
  containerHeight?: number;
  maxHeight?: number;
  spacing?: string;
  onImageClick?: (index: number) => void;
  showHeader?: boolean;
}

const DEFAULT_IMAGES: Array<{ src: string; alt: string; title?: string }> = [
  { src: 'https://images.unsplash.com/photo-1526406915894-6c6a1b1b62f3?q=80&w=1200&auto=format&fit=crop', alt: 'Architecture moderne au crépuscule', title: 'Architecture moderne' },
  { src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop', alt: 'Montagnes enneigées sous un ciel clair', title: 'Montagnes enneigées' },
  { src: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1200&auto=format&fit=crop', alt: 'Océan en mouvement avec vagues', title: "Mouvement de l’océan" },
  { src: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop', alt: 'Forêt baignée de lumière', title: 'Lumière en forêt' },
  { src: 'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?q=80&w=1200&auto=format&fit=crop', alt: 'Coucher de soleil sur la ville', title: 'Coucher de soleil urbain' },
  { src: 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?q=80&w=1200&auto=format&fit=crop', alt: 'Design minimaliste en noir et blanc', title: 'Design minimaliste' },
  { src: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1200&auto=format&fit=crop', alt: 'Paysage urbain de nuit', title: 'Ville de nuit' },
  { src: 'https://images.unsplash.com/photo-1500534313956-4c8d0eaf5854?q=80&w=1200&auto=format&fit=crop', alt: 'Portrait artistique en contre-jour', title: 'Portrait artistique' },
];

const angles = [-8, -4, -2, 0, 2, 4, 8];

export const PortfolioGallery: React.FC<PortfolioGalleryProps> = ({
  title = 'Parcourir ma galerie',
  images = DEFAULT_IMAGES,
  className,
  containerHeight = 280,
  maxHeight = 280,
  spacing,
  onImageClick,
  showHeader = false,
}) => {
  const tileH = Math.min(maxHeight, containerHeight);
  const idealW = Math.round(tileH * (16 / 9));
  const widthClamp = `clamp(180px, 28vw, ${idealW}px)`;
  const mobileWidth = `min(${idealW}px, 85vw)`;
  const mobileHeight = `min(${tileH}px, 48vw)`;

  return (
    <div className={cn('w-full overflow-hidden', className)} style={{ height: containerHeight }}>
      {showHeader && (
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        </div>
      )}

      {/* Mobile: défilement horizontal simple */}
      <div className="md:hidden">
        <div className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <motion.button
              key={idx}
              type="button"
              onClick={onImageClick ? () => onImageClick(idx) : undefined}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative inline-flex shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 bg-muted/10 shadow-sm"
              style={{ width: mobileWidth, height: mobileHeight }}
            >
              <img src={img.src} alt={img.alt} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Desktop: rangée compacte avec overlap + carte se redresse au hover */}
      <div className="hidden h-full w-full items-center overflow-hidden md:flex">
        <div className={cn('flex w-full items-center justify-center overflow-visible', spacing || '-space-x-16 lg:-space-x-24 xl:-space-x-32')}>
          {images.map((img, idx) => {
            const angle = angles[idx % angles.length];
            return (
              <motion.button
                key={idx}
                type="button"
                onClick={onImageClick ? () => onImageClick(idx) : undefined}
                initial={{ opacity: 0, y: 8, rotate: angle }}
                animate={{ opacity: 1, y: 0, rotate: angle }}
                transition={{ duration: 0.25, ease: 'easeOut', delay: idx * 0.03 }}
                whileHover={{ scale: 1.04, y: -4, rotate: 0, zIndex: 30 }}
                whileTap={{ scale: 0.99 }}
                className={cn(
                  'relative z-10 inline-flex shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-muted/10 shadow-subtle-sm',
                  'hover:shadow-md'
                )}
                style={{ width: widthClamp, height: tileH }}
              >
                <img src={img.src} alt={img.alt} className="h-full w-full object-cover" loading="lazy" decoding="async" />
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

PortfolioGallery.displayName = 'PortfolioGallery';

export default PortfolioGallery;
