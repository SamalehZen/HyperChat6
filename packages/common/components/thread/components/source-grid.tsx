'use client';
import { SearchResultsList } from '@repo/common/components';
import { Source } from '@repo/shared/types';

type SourceGridProps = {
    sources: Source[];
};

export const SourceGrid = ({ sources }: SourceGridProps) => {
    if (!sources || !Array.isArray(sources) || sources.length === 0) {
        return null;
    }

    const sortedSources = [...sources].sort((a, b) => (a?.index || 0) - (b?.index || 0));

    return (
        <div className="pb-8 pt-2">
            <SearchResultsList sources={sortedSources} />
        </div>
    );
};
