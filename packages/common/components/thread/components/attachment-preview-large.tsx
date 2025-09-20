'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ThreadItem } from '@repo/shared/types';

const isPdf = (dataUrl?: string) => typeof dataUrl === 'string' && dataUrl.startsWith('data:application/pdf');
const isImage = (dataUrl?: string) => typeof dataUrl === 'string' && dataUrl.startsWith('data:image/');

const dataURItoUint8Array = (dataURI: string): Uint8Array => {
    const base64 = dataURI.split(',')[1] || '';
    const binaryString = typeof window !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
};

const PdfPreview = ({ dataUrl, index }: { dataUrl: string; index: number }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasesRef = useRef<(HTMLCanvasElement | null)[]>([]);
    const [numPages, setNumPages] = useState<number>(0);
    const [renderedPages, setRenderedPages] = useState<Record<number, boolean>>({});
    const pdfRef = useRef<any>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const pdfjs: any = await import('pdfjs-dist');
                const data = dataURItoUint8Array(dataUrl);
                const loadingTask = pdfjs.getDocument({ data, disableWorker: true });
                const pdf = await loadingTask.promise;
                if (cancelled) return;
                pdfRef.current = pdf;
                setNumPages(pdf.numPages || 0);
            } catch (e) {
                setFailed(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [dataUrl]);

    useEffect(() => {
        if (!numPages || !pdfRef.current) return;
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(async entry => {
                    if (entry.isIntersecting) {
                        const el = entry.target as HTMLCanvasElement;
                        const pageNum = Number(el.dataset.page || '0');
                        if (!pageNum) return;
                        try {
                            const pdf = pdfRef.current;
                            const page = await pdf.getPage(pageNum);
                            const containerWidth = el.parentElement?.clientWidth || 480;
                            const initialViewport = page.getViewport({ scale: 1 });
                            const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
                            const scaleForWidth = (containerWidth / initialViewport.width) * dpr;
                            const viewport = page.getViewport({ scale: scaleForWidth });
                            const ctx = el.getContext('2d');
                            if (!ctx) return;
                            el.width = Math.floor(viewport.width);
                            el.height = Math.floor(viewport.height);
                            el.style.width = `${Math.floor(viewport.width / dpr)}px`;
                            el.style.height = `${Math.floor(viewport.height / dpr)}px`;
                            el.style.opacity = '0';
                            el.style.transition = 'opacity 200ms ease-out';
                            await page.render({ canvasContext: ctx, viewport }).promise;
                            el.style.opacity = '1';
                            setRenderedPages(prev => ({ ...prev, [pageNum]: true }));
                            observer.unobserve(el);
                        } catch (e) {}
                    }
                });
            },
            { root: containerRef.current, threshold: 0.1, rootMargin: '120px 0px' }
        );

        canvasesRef.current.forEach(c => c && observer.observe(c));
        return () => observer.disconnect();
    }, [numPages]);

    if (failed) {
        return (
            <object
                data={dataUrl}
                type="application/pdf"
                className="w-full max-h-[420px] rounded-md border"
                aria-label={`Aperçu PDF #${index + 1}`}
            />
        );
    }

    return (
        <div
            ref={containerRef}
            className="max-h-[480px] md:max-h-[520px] overflow-y-auto rounded-lg border shadow-subtle-xs"
            aria-label={`Aperçu PDF #${index + 1}`}
            role="group"
        >
            <div className="flex w-full flex-col items-stretch gap-3 p-3">
                {Array.from({ length: numPages || 0 }).map((_, i) => {
                    const pageIndex = i + 1;
                    const isRendered = !!renderedPages[pageIndex];
                    return (
                        <div
                            key={`pdf-${index}-wrap-${pageIndex}`}
                            className="relative w-full overflow-hidden rounded-lg border bg-background shadow-subtle-xs transition-transform duration-200 hover:scale-[1.005]"
                            style={{ minHeight: isRendered ? undefined : 240 }}
                        >
                            <canvas
                                ref={el => {
                                    canvasesRef.current[i] = el;
                                }}
                                data-page={pageIndex}
                                className="w-full"
                                style={{ willChange: 'transform, opacity' }}
                            />
                            {!isRendered && (
                                <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-br from-muted/50 to-muted/20" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const AttachmentPreviewLarge = ({ threadItem }: { threadItem: ThreadItem }) => {
    const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});

    const attachments = useMemo(() => {
        const arr = Array.isArray(threadItem?.imageAttachment)
            ? threadItem.imageAttachment
            : threadItem?.imageAttachment
            ? [threadItem.imageAttachment as any]
            : [];
        return (arr || []).filter(Boolean) as string[];
    }, [threadItem?.imageAttachment]);

    const items = attachments
        .map((att, idx) => {
            if (isPdf(att)) {
                return <PdfPreview key={`att-pdf-${idx}`} dataUrl={att} index={idx} />;
            }
            if (isImage(att)) {
                return (
                    <div key={`att-img-${idx}`} className="relative w-full overflow-hidden rounded-lg border shadow-subtle-xs transition-transform duration-200 hover:scale-[1.005]">
                        <img
                            src={att}
                            alt={`Pièce jointe ${idx + 1}`}
                            className="max-h-[360px] w-full object-contain opacity-0 transition-opacity duration-300"
                            role="img"
                            onLoad={e => {
                                (e.currentTarget as HTMLImageElement).style.opacity = '1';
                                setLoadedImages(prev => ({ ...prev, [idx]: true }));
                            }}
                        />
                        {!loadedImages[idx] && (
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/40 to-muted/10 animate-pulse" aria-hidden />
                        )}
                    </div>
                );
            }
            return null;
        })
        .filter(Boolean);

    if (!items.length) return null;

    return (
        <div className="mb-4 flex w-full flex-col gap-3">
            {items}
        </div>
    );
};
