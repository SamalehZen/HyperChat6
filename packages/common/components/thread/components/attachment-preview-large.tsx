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
    const canvasesRef = useRef<Array<HTMLCanvasElement | null>>([]);
    const [numPages, setNumPages] = useState<number>(0);
    const pdfRef = useRef<any>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const pdfjs: any = await import('pdfjs-dist');
                try {
                    const worker = (await import('pdfjs-dist/build/pdf.worker.min.js?url')).default as string;
                    if (pdfjs?.GlobalWorkerOptions) {
                        pdfjs.GlobalWorkerOptions.workerSrc = worker;
                    }
                } catch {}
                const data = dataURItoUint8Array(dataUrl);
                const loadingTask = pdfjs.getDocument({ data });
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
                            await page.render({ canvasContext: ctx, viewport }).promise;
                            observer.unobserve(el);
                        } catch (e) {}
                    }
                });
            },
            { root: containerRef.current, threshold: 0.1 }
        );

        canvasesRef.current.forEach(c => c && observer.observe(c));
        return () => observer.disconnect();
    }, [numPages]);

    if (failed) {
        return (
            <object
                data={dataUrl}
                type="application/pdf"
                className="w-full max-h-[360px] rounded border"
                aria-label={`Aperçu PDF #${index + 1}`}
            />
        );
    }

    return (
        <div
            ref={containerRef}
            className="max-h-[360px] overflow-y-auto rounded border"
            aria-label={`Aperçu PDF #${index + 1}`}
            role="group"
        >
            <div className="flex w-full flex-col items-center gap-2 p-2">
                {Array.from({ length: numPages || 0 }).map((_, i) => (
                    <canvas
                        key={`pdf-${index}-page-${i + 1}`}
                        ref={el => (canvasesRef.current[i] = el)}
                        data-page={i + 1}
                        className="w-full rounded bg-background"
                    />
                ))}
            </div>
        </div>
    );
};

export const AttachmentPreviewLarge = ({ threadItem }: { threadItem: ThreadItem }) => {
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
                    <div key={`att-img-${idx}`} className="w-full">
                        <img
                            src={att}
                            alt={`Pièce jointe ${idx + 1}`}
                            className="max-h-[320px] w-full rounded border object-contain"
                            role="img"
                        />
                    </div>
                );
            }
            return null;
        })
        .filter(Boolean);

    if (!items.length) return null;

    return (
        <div className="mb-3 flex w-full flex-col gap-2">
            {items}
        </div>
    );
};
