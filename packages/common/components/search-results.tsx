/* eslint-disable @next/next/no-img-element */
'use client';
import { LinkFavicon, LinkPreviewPopover } from '@repo/common/components';
import { Source } from '@repo/shared/types';
import { getHost, getHostname } from '@repo/shared/utils';
import React, { memo, useEffect, useMemo, useState } from 'react';

export type SearchResultsType = {
    sources: Source[];
};

const ogCache = new Map<string, string | null>();

export const SearchResultCard = memo(
    ({ source, forceHideImage, forcedImageUrl }: { source: Source; forceHideImage?: boolean; forcedImageUrl?: string | null }) => {
        const [imgUrl, setImgUrl] = useState<string | null>(forcedImageUrl ?? source.image ?? null);
        const [showImage, setShowImage] = useState<boolean>(!forceHideImage && !!(forcedImageUrl ?? source.image));

        const host = useMemo(() => getHost(source.link) || source.link, [source.link]);

        useEffect(() => {
            if (forceHideImage) {
                setShowImage(false);
            }
        }, [forceHideImage]);

        useEffect(() => {
            setImgUrl(forcedImageUrl ?? source.image ?? null);
            setShowImage(!forceHideImage && !!(forcedImageUrl ?? source.image));
        }, [forcedImageUrl, source.image, forceHideImage]);

        useEffect(() => {
            if (forceHideImage) return;
            if (forcedImageUrl) return;

            let cancelled = false;
            const fetchOg = async () => {
                if (source.image) return; // already provided
                const key = source.link;
                if (ogCache.has(key)) {
                    if (!cancelled) {
                        const cached = ogCache.get(key) ?? null;
                        setImgUrl(cached);
                        setShowImage(!!cached);
                    }
                    return;
                }
                try {
                    const res = await fetch(`/api/og?url=${encodeURIComponent(source.link)}`);
                    if (!res.ok) {
                        ogCache.set(key, null);
                        if (!cancelled) {
                            setImgUrl(null);
                            setShowImage(false);
                        }
                        return;
                    }
                    const data = (await res.json()) as { image: string | null };
                    const image = data?.image || null;
                    ogCache.set(key, image);
                    if (!cancelled) {
                        setImgUrl(image);
                        setShowImage(!!image);
                    }
                } catch (e) {
                    ogCache.set(source.link, null);
                    if (!cancelled) {
                        setImgUrl(null);
                        setShowImage(false);
                    }
                }
            };
            fetchOg();
            return () => {
                cancelled = true;
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [source.link, forceHideImage, forcedImageUrl]);

    const onOpen = () => {
        window?.open(source.link, '_blank', 'noopener,noreferrer');
    };

    const CardInner = (
        <div
            className="group hover:border-brand/30 hover:shadow-brand/10 rounded-xl border bg-background shadow-sm transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={onOpen}
            role="button"
            aria-label={`Ouvrir ${getHostname(source.link) || host} — ${source.title || ''}`}
            tabIndex={0}
            onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') onOpen();
            }}
        >
            {showImage && imgUrl ? (
                <div className="relative w-full overflow-hidden rounded-t-xl pb-[56.25%]">
                    <img
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        src={imgUrl}
                        alt={source.title || host || 'preview'}
                        className="absolute inset-0 h-full w-full origin-center transform object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        onError={() => setShowImage(false)}
                    />
                    <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-black/10 opacity-90" />
                </div>
            ) : null}

            <div className="p-3">
                <div className="mb-2 flex items-center gap-2">
                    <LinkFavicon link={host} />
                    <span className="text-muted-foreground line-clamp-1 text-xs">{getHostname(source.link)}</span>
                </div>
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
                    {source.title || host}
                </h3>
                {source.snippet ? (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{source.snippet}</p>
                ) : null}
            </div>
        </div>
    );

    return (
        <LinkPreviewPopover source={source}>
            {CardInner}
        </LinkPreviewPopover>
    );
});

export const SearchResultsList = ({ sources }: SearchResultsType) => {
    if (!Array.isArray(sources) || sources.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sources.map((source, index) => (
                <SearchResultCard source={source} key={`source-${source.link}-${index}`} />
            ))}
        </div>
    );
};
