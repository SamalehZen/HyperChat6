'use client';
import { LinkFavicon, SearchResultCard } from '@repo/common/components';
import { useAppStore } from '@repo/common/store';
import { Source } from '@repo/shared/types';
import { SourceList } from './source-list';

type SourceGridProps = {
    sources: Source[];
};

export const SourceGrid = ({ sources }: SourceGridProps) => {
    const openSideDrawer = useAppStore(state => state.openSideDrawer);

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
        return null;
    }

    const sortedSources = [...sources].sort((a, b) => (a?.index || 0) - (b?.index || 0));
    const firstFive = sortedSources.slice(0, 5);
    const remaining = sortedSources.length - firstFive.length;

    return (
        <div className="grid grid-cols-1 gap-4 pb-8 pt-2 md:grid-cols-2 lg:grid-cols-3">
            {firstFive.map((source, idx) => (
                <SearchResultCard key={`conv-source-${source.link}-${idx}`} source={source} />
            ))}
            {remaining > 0 && (
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
                        <span className="text-muted-foreground text-xs">+{remaining} Sources</span>
                    </div>
                    <p className="text-foreground line-clamp-2 text-sm font-medium leading-snug">
                        Voir toutes les sources
                    </p>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                        Ouvrir la liste complète dans le panneau latéral
                    </p>
                </div>
            )}
        </div>
    );
};
