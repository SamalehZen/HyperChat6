'use client';
import { LinkFavicon, SearchResultCard } from '@repo/common/components';
import { useAppStore } from '@repo/common/store';
import { Source } from '@repo/shared/types';
import { IconList } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { SourceList } from './source-list';

type SourceGridProps = {
    sources: Source[];
};

export const SourceGrid = ({ sources }: SourceGridProps) => {
    const openSideDrawer = useAppStore(state => state.openSideDrawer);

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
        return null;
    }

    const sortedSources = useMemo(
        () => [...sources].sort((a, b) => (a?.index || 0) - (b?.index || 0)),
        [sources]
    );

    const [imageMap, setImageMap] = useState<Record<string, string | null>>({});

    useEffect(() => {
        let cancelled = false;
        const prefetch = async () => {
            const slice = sortedSources.slice(0, 12);
            await Promise.all(
                slice.map(async s => {
                    if (s.image !== undefined || imageMap[s.link] !== undefined) return;
                    try {
                        const res = await fetch(`/api/og?url=${encodeURIComponent(s.link)}`);
                        const data = (await res.json()) as { image: string | null };
                        if (!cancelled) {
                            setImageMap(prev => ({ ...prev, [s.link]: data?.image || null }));
                        }
                    } catch {
                        if (!cancelled) {
                            setImageMap(prev => ({ ...prev, [s.link]: null }));
                        }
                    }
                })
            );
        };
        prefetch();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortedSources.map(s => s.link).join('|')]);

    const selection = useMemo(() => {
        const withImage: Array<{ source: Source; img: string | null }> = [];
        const withoutImage: Source[] = [];

        for (const s of sortedSources) {
            const img = s.image ?? imageMap[s.link] ?? null;
            if (img) withImage.push({ source: s, img });
            else withoutImage.push(s);
        }

        const firstThree = withImage.slice(0, 3).map(({ source, img }) => ({ source, img }));

        const remainingSourcesSet = new Set(sortedSources.map(s => s.link));
        firstThree.forEach(({ source }) => remainingSourcesSet.delete(source.link));

        const remainingOrdered = sortedSources.filter(s => remainingSourcesSet.has(s.link));
        const noImageOrdered = remainingOrdered.filter(s => !(s.image ?? imageMap[s.link]));

        const nextTwoText = noImageOrdered.slice(0, 2);

        if (nextTwoText.length < 2) {
            const deficit = 2 - nextTwoText.length;
            const fillers = remainingOrdered
                .filter(s => !nextTwoText.some(x => x.link === s.link))
                .slice(0, deficit);
            nextTwoText.push(...fillers);
        }

        const normalizedCards: Array<{ source: Source; forcedImageUrl: string | null; forceHideImage: boolean }> = [];
        normalizedCards.push(
            ...firstThree.map(({ source, img }) => ({ source, forcedImageUrl: img, forceHideImage: false }))
        );
        normalizedCards.push(
            ...nextTwoText.map(source => ({ source, forcedImageUrl: null, forceHideImage: true }))
        );

        const cards = normalizedCards.slice(0, 5);
        const extrasCount = Math.max(sortedSources.length - cards.length, 0);
        return { cards, extrasCount };
    }, [sortedSources, imageMap]);

    return (
        <div className="grid grid-cols-1 gap-4 pb-8 pt-2 md:grid-cols-2 lg:grid-cols-3">
            {selection.cards.map(({ source, forcedImageUrl, forceHideImage }, idx) => (
                <SearchResultCard
                    key={`conv-source-${source.link}-${idx}`}
                    source={source}
                    forcedImageUrl={forcedImageUrl}
                    forceHideImage={forceHideImage}
                />
            ))}
            {selection.extrasCount > 0 && (
                <div
                    className="group hover:border-brand/30 hover:shadow-brand/10 flex cursor-pointer flex-col rounded-xl border bg-background p-3 shadow-sm transition-all hover:shadow-md"
                    onClick={() =>
                        openSideDrawer({
                            title: 'Sources',
                            badge: sortedSources.length,
                            renderContent: () => <SourceList sources={sortedSources} />,
                        })
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            openSideDrawer({
                                title: 'Sources',
                                badge: sortedSources.length,
                                renderContent: () => <SourceList sources={sortedSources} />,
                            });
                        }
                    }}
                >
                    <div className="mb-2 flex items-center gap-2">
                        <div className="flex -space-x-1">
                            {sortedSources
                                .slice(5)
                                .slice(0, 5)
                                .map((s, i) => (
                                    <div key={i} className="relative z-0">
                                        <LinkFavicon link={s.link} />
                                    </div>
                                ))}
                        </div>
                        <span className="text-muted-foreground text-xs">+{selection.extrasCount} sources</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <IconList size={16} className="text-muted-foreground" />
                        <p className="text-foreground line-clamp-2 text-sm font-medium leading-snug">
                            Voir toutes les sources
                        </p>
                    </div>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                        Ouvrir la liste complète dans le panneau latéral gauche
                    </p>
                </div>
            )}
        </div>
    );
};
