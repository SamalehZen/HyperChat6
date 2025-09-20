import { CitationProviderContext, CodeBlock, LinkPreviewPopover } from '@repo/common/components';
import { isValidUrl } from '@repo/shared/utils';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { ComponentProps, ReactElement, useContext, useRef } from 'react';
import * as XLSX from 'xlsx';

function tableToAOA(table: HTMLTableElement): string[][] {
    const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[];
    const aoa: string[][] = [];
    for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('th,td')) as (HTMLTableCellElement)[];
        const rowData = cells.map(cell => (cell.textContent || '').trim());
        if (rowData.length > 0) aoa.push(rowData);
    }
    return aoa;
}

function downloadCSV(aoa: string[][], filename = 'extraction.csv') {
    const escape = (s: string) => '"' + s.replace(/"/g, '""') + '"';
    const csv = aoa.map(row => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadXLSX(aoa: string[][], filename = 'extraction.xlsx') {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Feuille1');
    XLSX.writeFile(wb, filename);
}

const TableWithExport = ({ children, ...props }: any) => {
    const tableRef = useRef<HTMLTableElement | null>(null);
    const handleDownload = (type: 'csv' | 'xlsx') => {
        if (!tableRef.current) return;
        const aoa = tableToAOA(tableRef.current);
        if (!aoa || aoa.length === 0) return;
        if (type === 'csv') downloadCSV(aoa);
        else downloadXLSX(aoa);
    };
    return (
        <div className="relative">
            <table ref={tableRef} {...props}>
                {children}
            </table>
            <div className="absolute right-1 top-1 flex gap-1">
                <button type="button" onClick={() => handleDownload('csv')} className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--chat-input-control-bg))] hover:bg-[hsl(var(--chat-input-control-hover-bg))] border border-[hsl(var(--chat-input-border))]">CSV</button>
                <button type="button" onClick={() => handleDownload('xlsx')} className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--chat-input-control-bg))] hover:bg-[hsl(var(--chat-input-control-hover-bg))] border border-[hsl(var(--chat-input-border))]">XLSX</button>
            </div>
        </div>
    );
};

export const mdxComponents: ComponentProps<typeof MDXRemote>['components'] = {
    Source: ({ children }) => {
        const { getSourceByIndex } = useContext(CitationProviderContext);
        const index = children as string;

        const source = getSourceByIndex(parseInt(index));

        const url = source?.link;

        if (!url) {
            return null;
        }

        const isValid = isValidUrl(url);

        if (!isValid) {
            return null;
        }

        return (
            <LinkPreviewPopover source={source}>
                <div className="bg-quaternary text-quaternary-foreground/50 hover:bg-brand group mx-0.5 inline-flex size-3.5 flex-row items-center justify-center gap-1 rounded-sm text-[10px] font-medium hover:text-white">
                    {source?.index}
                </div>
            </LinkPreviewPopover>
        );
    },
    p: ({ children }) => {
        return <p>{children}</p>;
    },
    li: ({ children }) => {
        return <li>{children}</li>;
    },

    pre: ({ children }) => {
        if (typeof children === 'string') {
            return <CodeBlock code={children.replace(/<FadeEffect \/>$/, '')} />;
        }
        const codeElement = children as ReactElement;
        const className = codeElement?.props?.className || '';
        const lang = className.replace('language-', '');
        const code = codeElement?.props?.children;

        return <CodeBlock code={String(code).replace(/<FadeEffect \/>$/, '')} lang={lang} />;
    },
    code: ({ children, className }) => {
        if (!className) {
            return (
                <code className="border-brand/20 !bg-brand/10 text-brand rounded-md border px-1.5 py-0.5 font-mono text-sm">
                    {children}
                </code>
            );
        }
        const lang = className.replace('language-', '');
        return <CodeBlock code={String(children).replace(/<FadeEffect \/>$/, '')} lang={lang} />;
    },
    table: (props: any) => <TableWithExport {...props} />,
};
