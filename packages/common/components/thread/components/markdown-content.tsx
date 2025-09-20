import {
    ErrorBoundary,
    ErrorPlaceholder,
    mdxComponents,
    useMdxChunker,
} from '@repo/common/components';
import { cn } from '@repo/ui';
import { MDXRemote } from 'next-mdx-remote';
import { MDXRemoteSerializeResult } from 'next-mdx-remote/rsc';
import { serialize } from 'next-mdx-remote/serialize';
import { memo, Suspense, useEffect, useState } from 'react';
import remarkGfm from 'remark-gfm';

export const markdownStyles = {
    'animate-fade-in prose prose-sm min-w-full': true,

    // Text styles
    'prose-p:font-normal prose-p:text-base prose-p:leading-[1.65rem]': true,
    'prose-headings:text-base prose-headings:font-medium ': true,
    'prose-h1:text-2xl prose-h1:font-medium ': true,
    'prose-h2:text-2xl prose-h2:font-medium ': true,
    'prose-h3:text-lg prose-h3:font-medium ': true,
    'prose-strong:font-medium prose-th:font-medium': true,

    'prose-li:text-muted-foreground prose-li:font-normal prose-li:leading-[1.65rem]': true,

    // Code styles
    'prose-code:font-mono prose-code:text-sm prose-code:font-normal': true,
    'prose-code:bg-secondary prose-code:border-border prose-code:border prose-code:rounded-lg prose-code:p-0.5':
        true,

    // Table styles
    'prose-table:border-border prose-table:border prose-table:rounded-lg prose-table:bg-background':
        true,

    // Table header
    'prose-th:text-sm prose-th:font-medium prose-th:text-muted-foreground prose-th:bg-tertiary prose-th:px-3 prose-th:py-1.5':
        true,

    // Table row
    'prose-tr:border-border prose-tr:border': true,

    // Table cell
    'prose-td:px-3 prose-td:py-2.5': true,

    // Theme
    'prose-prosetheme': true,
};

type MarkdownContentProps = {
    content: string;
    className?: string;
    shouldAnimate?: boolean;
    isCompleted?: boolean;
    isLast?: boolean;
    totalAttachments?: number;
};

type NestedChunk = {
    id: string;
    content: string;
    children: NestedChunk[];
};

export const removeIncompleteTags = (content: string) => {
    // A simpler approach that handles most cases:
    // 1. If the last < doesn't have a matching >, remove from that point onward
    const lastLessThan = content.lastIndexOf('<');
    if (lastLessThan !== -1) {
        const textAfterLastLessThan = content.substring(lastLessThan);
        if (!textAfterLastLessThan.includes('>')) {
            return content.substring(0, lastLessThan);
        }
    }

    return content;
};

// New function to normalize content before serialization
export const normalizeContent = (content: string) => {
    // Replace literal "\n" strings with actual newlines
    // This handles cases where newlines are escaped in the string
    return content.replace(/\\n/g, '\n');
};

function parseCitationsWithSourceTags(markdown: string): string {
    // Basic single citation regex
    const citationRegex = /\[(\d+)\]/g;
    let result = markdown;

    // Replace each citation with the wrapped version
    result = result.replace(citationRegex, (match, p1) => {
        return `<Source>${p1}</Source>`;
    });

    // This regex and replacement logic needs to be fixed
    const multipleCitationsRegex = /\[(\d+(?:,\s*\d+)+)\]/g;
    result = result.replace(multipleCitationsRegex, match => {
        // Extract all numbers from the citation
        const numbers = match.match(/\d+/g) || [];
        // Create Source tags for each number
        return numbers.map(num => `<Source>${num}</Source>`).join(' ');
    });

    return result;
}

export const MarkdownContent = memo(
    ({ content, className, isCompleted, isLast, totalAttachments }: MarkdownContentProps) => {
        const [previousContent, setPreviousContent] = useState<string[]>([]);
        const [currentContent, setCurrentContent] = useState<string>('');
        const { chunkMdx } = useMdxChunker();
        const containerRef = useRef<HTMLDivElement | null>(null);
        const [tableCount, setTableCount] = useState<number>(0);

        useEffect(() => {
            if (!content) return;

            // Count tables after content updates
            setTimeout(() => {
                if (containerRef.current) {
                    const count = containerRef.current.querySelectorAll('table').length;
                    setTableCount(count);
                }
            }, 0);

            (async () => {
                try {
                    const normalizedContent = normalizeContent(content);
                    const contentWithCitations = parseCitationsWithSourceTags(normalizedContent);

                    if (isCompleted) {
                        setPreviousContent([]);
                        setCurrentContent(contentWithCitations);
                    } else {
                        const { chunks } = await chunkMdx(contentWithCitations);

                        if (chunks.length > 0) {
                            if (chunks.length > 1) {
                                setPreviousContent(chunks.slice(0, -1));
                            } else {
                                setPreviousContent([]);
                            }
                            setCurrentContent(chunks[chunks.length - 1] || '');
                        }
                    }
                } catch (error) {
                    console.error('Error processing MDX chunks:', error);
                }
            })();
        }, [content, isCompleted]);

        const renderExportBar = () => {
            const shouldShowMulti = (tableCount > 1) || ((totalAttachments || 0) > 1);
            if (!shouldShowMulti) return null;

            const tableToAOA = (table: HTMLTableElement): string[][] => {
                const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[];
                const aoa: string[][] = [];
                for (const row of rows) {
                    const cells = Array.from(row.querySelectorAll('th,td')) as (HTMLTableCellElement)[];
                    const rowData = cells.map(cell => (cell.textContent || '').trim());
                    if (rowData.length > 0) aoa.push(rowData);
                }
                return aoa;
            };

            const exportMultiXLSX = () => {
                if (!containerRef.current) return;
                const tables = Array.from(containerRef.current.querySelectorAll('table')) as HTMLTableElement[];
                if (tables.length === 0) return;
                const wb = XLSX.utils.book_new();
                tables.forEach((t, i) => {
                    const aoa = tableToAOA(t);
                    const ws = XLSX.utils.aoa_to_sheet(aoa);
                    XLSX.utils.book_append_sheet(wb, ws, `Doc ${i + 1}`);
                });
                XLSX.writeFile(wb, 'extraction-multi.xlsx');
            };

            const exportGlobalXLSX = () => {
                if (!containerRef.current) return;
                const tables = Array.from(containerRef.current.querySelectorAll('table')) as HTMLTableElement[];
                if (tables.length === 0) return;
                const all: string[][] = [];
                tables.forEach((t, idx) => {
                    const aoa = tableToAOA(t);
                    if (idx === 0) {
                        all.push(...aoa);
                    } else {
                        // skip header row if shapes match and header likely present
                        const dataRows = aoa.length > 1 ? aoa.slice(1) : aoa;
                        all.push(...dataRows);
                    }
                });
                const ws = XLSX.utils.aoa_to_sheet(all);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Global');
                XLSX.writeFile(wb, 'extraction-global.xlsx');
            };

            const exportGlobalCSV = () => {
                if (!containerRef.current) return;
                const tables = Array.from(containerRef.current.querySelectorAll('table')) as HTMLTableElement[];
                if (tables.length === 0) return;
                const all: string[][] = [];
                tables.forEach((t, idx) => {
                    const aoa = tableToAOA(t);
                    if (idx === 0) all.push(...aoa);
                    else all.push(...(aoa.length > 1 ? aoa.slice(1) : aoa));
                });
                const escape = (s: string) => '"' + s.replace(/"/g, '""') + '"';
                const csv = all.map(r => r.map(escape).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'extraction-global.csv';
                a.click();
                URL.revokeObjectURL(url);
            };

            return (
                <div className="not-prose mb-2 flex items-center justify-end gap-2">
                    <button type="button" onClick={exportGlobalCSV} className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--chat-input-control-bg))] hover:bg-[hsl(var(--chat-input-control-hover-bg))] border border-[hsl(var(--chat-input-border))]">CSV global</button>
                    <button type="button" onClick={exportGlobalXLSX} className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--chat-input-control-bg))] hover:bg-[hsl(var(--chat-input-control-hover-bg))] border border-[hsl(var(--chat-input-border))]">XLSX global</button>
                    <button type="button" onClick={exportMultiXLSX} className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--chat-input-control-bg))] hover:bg-[hsl(var(--chat-input-control-hover-bg))] border border-[hsl(var(--chat-input-border))]">XLSX multi‑onglets</button>
                </div>
            );
        };

        if (isCompleted && !isLast) {
            return (
                <div className={cn('', markdownStyles, className)} ref={containerRef}>
                    {renderExportBar()}
                    <ErrorBoundary fallback={<ErrorPlaceholder />}>
                        <MemoizedMdxChunk chunk={currentContent} />
                    </ErrorBoundary>
                </div>
            );
        }

        return (
            <div className={cn('', markdownStyles, className)} ref={containerRef}>
                {renderExportBar()}
                {previousContent.length > 0 &&
                    previousContent.map((chunk, index) => (
                        <ErrorBoundary fallback={<ErrorPlaceholder />} key={`prev-${index}`}>
                            <MemoizedMdxChunk chunk={chunk} />
                        </ErrorBoundary>
                    ))}
                {currentContent && (
                    <ErrorBoundary fallback={<ErrorPlaceholder />} key="current-chunk">
                        <MemoizedMdxChunk chunk={currentContent} />
                    </ErrorBoundary>
                )}
            </div>
        );
    }
);

MarkdownContent.displayName = 'MarkdownContent';

export const MemoizedMdxChunk = memo(({ chunk }: { chunk: string }) => {
    const [mdx, setMdx] = useState<MDXRemoteSerializeResult | null>(null);

    useEffect(() => {
        if (!chunk) return;

        let isMounted = true;

        (async () => {
            try {
                const serialized = await serialize(chunk, {
                    mdxOptions: {
                        remarkPlugins: [remarkGfm],
                        // rehypePlugins: [rehypeSanitize],
                    },
                });

                if (isMounted) {
                    setMdx(serialized);
                }
            } catch (error) {
                console.error('Error serializing MDX chunk:', error);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [chunk]);

    if (!mdx) {
        return null;
    }

    return (
        <ErrorBoundary fallback={<ErrorPlaceholder />}>
            <Suspense fallback={<div>Loading...</div>}>
                <MDXRemote {...mdx} components={mdxComponents} />
            </Suspense>
        </ErrorBoundary>
    );
});

MemoizedMdxChunk.displayName = 'MemoizedMdxChunk';
