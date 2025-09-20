import { createTask } from '@repo/orchestrator';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { handleError, sendEvents } from '../utils';
import type { CoreMessage } from 'ai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const EXPORT_DIR = process.env.EXPORT_DIR || path.join(os.tmpdir(), 'hyperchat-exports');
const FREE_OCR_LANGUAGES = process.env.FREE_OCR_LANGUAGES || 'eng+fra';
const FREE_OCR_MAX_PAGES = Number(process.env.FREE_OCR_MAX_PAGES || 10);
const FREE_OCR_TIMEOUT_MS = Number(process.env.FREE_OCR_TIMEOUT_MS || 120000);

// Small helper to ensure directories exist
function ensureDirSync(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Parse data URLs like data:application/pdf;base64,... to Buffer and mimetype
function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  try {
    if (!dataUrl.startsWith('data:')) return null;
    const [meta, base64] = dataUrl.split(',');
    const mime = meta.substring(5, meta.indexOf(';'));
    const buffer = Buffer.from(base64, 'base64');
    return { mime, buffer };
  } catch {
    return null;
  }
}

function extractAttachments(messages: CoreMessage[]): { images: Buffer[]; pdfs: Buffer[] } {
  const images: Buffer[] = [];
  const pdfs: Buffer[] = [];
  for (const msg of messages) {
    const content = (msg as any).content;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part?.type === 'image' && typeof part?.image === 'string') {
          const parsed = parseDataUrl(part.image);
          if (parsed) {
            if (parsed.mime === 'application/pdf') pdfs.push(parsed.buffer);
            else if (parsed.mime?.startsWith('image/')) images.push(parsed.buffer);
          }
        } else if (typeof part === 'string') {
          // ignore plain text
        }
      }
    }
  }
  return { images, pdfs };
}

async function detectPdfIsDigital(buf: Buffer): Promise<boolean> {
  // Use pdf-parse to quickly extract text
  const pdfParse = (await import('pdf-parse')).default as any;
  try {
    const result = await pdfParse(buf);
    const text: string = result?.text || '';
    const hasEnoughText = text && text.replace(/\s+/g, ' ').trim().length > 200;
    const looksTabular = /\||\t|\s{2,}/.test(text || '');
    return !!(hasEnoughText && looksTabular);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/encrypted|password/i.test(msg)) {
      throw new Error('Le PDF est chiffré/protégé par mot de passe et ne peut pas être traité.');
    }
    // If parse fails, assume scanned
    return false;
  }
}

async function extractWithTabula(pdfPath: string, pagesSpec: string): Promise<{ tables: string[][]; csvAll: string } | null> {
  try {
    const Tabula: any = (await import('tabula-js')).default || (await import('tabula-js') as any);
    const t = (Tabula as any)(pdfPath);

    // Try lattice first
    const csvLattice: string = await new Promise((resolve, reject) => {
      try {
        t.pages(pagesSpec).lattice(true).extractCsv((err: any, data: string) => {
          if (err) return reject(err);
          resolve(data || '');
        });
      } catch (e) {
        reject(e);
      }
    });

    let csv = csvLattice;

    if (!csv || csv.trim().length === 0) {
      // Fallback to stream
      const t2 = (Tabula as any)(pdfPath);
      csv = await new Promise((resolve, reject) => {
        try {
          t2.pages(pagesSpec).stream(true).extractCsv((err: any, data: string) => {
            if (err) return reject(err);
            resolve(data || '');
          });
        } catch (e) {
          reject(e);
        }
      });
    }

    const tables = csv
      .split('\n')
      .map(row => row.split(','))
      .filter(row => row.length > 1 || (row.length === 1 && row[0].trim() !== ''));

    return { tables, csvAll: csv };
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/java|spawn/i.test(msg)) {
      throw new Error('Java/Tabula indisponible. Bascule sur un mode de secours (sans Tabula).');
    }
    // Other errors -> return null to fallback
    return null;
  }
}

// Minimal canvas factory for pdfjs-dist using @napi-rs/canvas
class NodeCanvasFactory {
  create(width: number, height: number) {
    const { createCanvas } = require('@napi-rs/canvas');
    const canvas = createCanvas(Math.max(width, 1), Math.max(height, 1));
    const context = canvas.getContext('2d');
    return { canvas, context };
  }
  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = Math.max(width, 1);
    canvasAndContext.canvas.height = Math.max(height, 1);
  }
  destroy(canvasAndContext: any) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

async function rasterizePdfToImages(buf: Buffer, maxPages: number): Promise<Buffer[]> {
  const pdfjsLib: any = await import('pdfjs-dist');
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pageCount = Math.min(pdf.numPages, maxPages);
  const images: Buffer[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // ~ 192 DPI if default is 96
    const factory = new NodeCanvasFactory();
    const { canvas, context } = factory.create(viewport.width, viewport.height);
    await page.render({ canvasContext: context, viewport, canvasFactory: factory as any }).promise;
    const pngBuffer: Buffer = (canvas as any).toBuffer('image/png');
    images.push(pngBuffer);
  }
  return images;
}

async function extractDigitalPdfTablesWithPdfjs(buf: Buffer, maxPages: number): Promise<string[][][]> {
  const pdfjsLib: any = await import('pdfjs-dist');
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pageCount = Math.min(pdf.numPages, maxPages);
  const pagesRows: string[][][] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const words: Array<{ text: string; bbox: { x0: number; x1: number; y0: number; y1: number } }> = [];
    // textContent.items contains glyph runs with transform matrix [a,b,c,d,e,f]
    // e,f are x,y positions. We approximate bbox using font size d and text width.
    for (const item of (textContent.items || [])) {
      const str = (item as any).str || '';
      if (!str) continue;
      const tr = (item as any).transform || [1, 0, 0, 1, 0, 0];
      const x = tr[4] || 0;
      const y = tr[5] || 0;
      const fontHeight = Math.abs(tr[3] || 10);
      const width = Math.max(((item as any).width || str.length * (fontHeight * 0.6)), 1);
      words.push({ text: str, bbox: { x0: x, x1: x + width, y0: y, y1: y + fontHeight } });
    }
    const rows = reconstructTableFromWords(words);
    pagesRows.push(rows);
  }
  return pagesRows;
}

// Very simple column reconstruction using x-centers histogram bins
function reconstructTableFromWords(words: Array<{ text: string; bbox: { x0: number; x1: number; y0: number; y1: number } }>) {
  const linesMap = new Map<number, Array<{ text: string; xCenter: number }>>();
  // Group words by approximate line using y0
  const sorted = words.slice().sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
  let currentLineY = -Infinity;
  let lineIdx = -1;
  const yTolerance = 8;
  for (const w of sorted) {
    if (Math.abs(w.bbox.y0 - currentLineY) > yTolerance) {
      lineIdx++;
      currentLineY = w.bbox.y0;
    }
    const xCenter = (w.bbox.x0 + w.bbox.x1) / 2;
    if (!linesMap.has(lineIdx)) linesMap.set(lineIdx, []);
    linesMap.get(lineIdx)!.push({ text: w.text, xCenter });
  }

  // Build global column centers
  const xCenters: number[] = [];
  linesMap.forEach(arr => arr.forEach(w => xCenters.push(w.xCenter)));
  xCenters.sort((a, b) => a - b);
  const tolerance = 24; // px tolerance to cluster columns
  const columns: number[] = [];
  for (const x of xCenters) {
    const nearestIndex = columns.findIndex(c => Math.abs(c - x) <= tolerance);
    if (nearestIndex === -1) columns.push(x);
    else columns[nearestIndex] = (columns[nearestIndex] + x) / 2;
  }
  columns.sort((a, b) => a - b);

  // Build rows
  const rows: string[][] = [];
  const totalCols = columns.length || 1;
  const columnThreshold = tolerance;
  Array.from(linesMap.keys())
    .sort((a, b) => a - b)
    .forEach(k => {
      const cells = new Array(totalCols).fill('');
      const parts = linesMap.get(k) || [];
      for (const p of parts) {
        let colIndex = 0;
        let bestDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < columns.length; i++) {
          const d = Math.abs(columns[i] - p.xCenter);
          if (d < bestDist) {
            bestDist = d;
            colIndex = i;
          }
        }
        if (bestDist <= columnThreshold) {
          cells[colIndex] = cells[colIndex] ? `${cells[colIndex]} ${p.text}` : p.text;
        } else {
          // Append to nearest column anyway
          cells[colIndex] = cells[colIndex] ? `${cells[colIndex]} ${p.text}` : p.text;
        }
      }
      rows.push(cells.map(c => c.trim()));
    });
  return rows;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message = 'Timeout'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, err => { clearTimeout(t); reject(err); });
  });
}

async function ocrImageToRows(buf: Buffer, languages: string, timeoutMs: number): Promise<string[][]> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker({
    langPath: process.env.TESSDATA_BASE || 'https://tessdata.projectnaptha.com/4.0.0',
    cacheMethod: 'readOnly',
    logger: () => {},
  } as any);
  try {
    await worker.loadLanguage(languages);
    await worker.initialize(languages);
    const { data } = await withTimeout(worker.recognize(buf as any), timeoutMs, 'OCR timeout');
    const words = (data?.words || []).map((w: any) => ({
      text: w?.text || '',
      bbox: { x0: w?.bbox?.x0 || w?.x0 || 0, x1: w?.bbox?.x1 || w?.x1 || 0, y0: w?.bbox?.y0 || w?.y0 || 0, y1: w?.bbox?.y1 || w?.y1 || 0 },
    })).filter((w: any) => !!w.text);
    const rows = reconstructTableFromWords(words);
    return rows;
  } finally {
    try { await worker.terminate(); } catch {}
  }
}

function toCsv(rows: string[][]): string {
  return rows.map(r => r.map(cell => {
    const v = cell.replace(/"/g, '""');
    if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v}"`;
    return v;
  }).join(',')).join('\n');
}

async function buildXlsxAndCsv({
  sheets,
  consolidated,
  outBase,
}: {
  sheets: Array<{ name: string; rows: string[][] }>;
  consolidated: string[][];
  outBase: string; // path without extension
}) {
  const xlsx = await import('xlsx');
  const wb = xlsx.utils.book_new();
  sheets.forEach(s => {
    const ws = xlsx.utils.aoa_to_sheet(s.rows);
    xlsx.utils.book_append_sheet(wb, ws, s.name.substring(0, 31));
  });
  const consolidatedWs = xlsx.utils.aoa_to_sheet(consolidated);
  xlsx.utils.book_append_sheet(wb, consolidatedWs, 'Consolidated');

  const xlsxOut = `${outBase}.xlsx`;
  const csvOut = `${outBase}.csv`;
  xlsx.writeFile(wb, xlsxOut);
  fs.writeFileSync(csvOut, toCsv(consolidated));
  return { xlsxOut, csvOut };
}

export const freeDocToExcelTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
  name: 'free-doc-to-excel',
  execute: async ({ events, context, signal }) => {
    const { updateAnswer, updateStatus, updateStep, nextStepId } = sendEvents(events);

    const messages = (context?.get('messages') || []) as CoreMessage[];
    const { images, pdfs } = extractAttachments(messages);

    if (images.length + pdfs.length === 0) {
      updateAnswer({ text: 'Veuillez joindre des images ou des PDF contenant des tableaux pour convertir en Excel.', status: 'COMPLETED' });
      updateStatus('COMPLETED');
      return 'NO_ATTACHMENTS';
    }

    updateAnswer({ text: 'Préparation des pièces jointes…\n', status: 'PENDING' });

    ensureDirSync(EXPORT_DIR);
    const baseName = `${context?.get('threadId')}-${context?.get('threadItemId')}-${Date.now()}`;
    const outBase = path.join(EXPORT_DIR, baseName);

    // Collect all extracted sheets and consolidated rows
    const sheets: Array<{ name: string; rows: string[][] }> = [];
    const consolidated: string[][] = [];

    // Process PDFs
    let pagesBudget = FREE_OCR_MAX_PAGES;

    if (pdfs.length > 0) {
      const stepId = nextStepId();
      updateStep({ stepId, text: `Traitement des PDF (${pdfs.length})`, stepStatus: 'PENDING', subSteps: {} });

      for (let pi = 0; pi < pdfs.length; pi++) {
        if (signal?.aborted) throw new Error('Opération annulée');
        const pdfBuf = pdfs[pi];
        const tmpPdf = `${outBase}-in-${pi + 1}.pdf`;
        fs.writeFileSync(tmpPdf, pdfBuf);

        let pageImages: Buffer[] = [];
        let usedPages = 0;

        // Determine digital vs scanned
        let isDigital = false;
        try {
          isDigital = await detectPdfIsDigital(pdfBuf);
        } catch (e: any) {
          updateAnswer({ text: `\n${e?.message || String(e)}`, status: 'PENDING' });
        }

        if (isDigital) {
          try {
            const pagesSpec = `1-${Math.max(1, pagesBudget)}`; // bounded below
            const tabula = await extractWithTabula(tmpPdf, pagesSpec);
            if (tabula && tabula.tables.length) {
              // Split into pages heuristically by empty rows as separators
              const perPage: string[][][] = [];
              let current: string[][] = [];
              for (const row of tabula.tables) {
                if (row.every(c => c.trim() === '')) {
                  if (current.length) { perPage.push(current); current = []; }
                } else {
                  current.push(row);
                }
              }
              if (current.length) perPage.push(current);

              const takePages = Math.min(perPage.length, pagesBudget);
              for (let p = 0; p < takePages; p++) {
                const rows = perPage[p];
                const title = `PDF${pi + 1}-Page${p + 1}`;
                sheets.push({ name: title, rows });
                consolidated.push(...rows);
              }
              usedPages = takePages;
              pagesBudget -= usedPages;
              updateStep({ stepId, stepStatus: 'PENDING', subSteps: { [`pdf-${pi + 1}`]: { status: 'COMPLETED', data: { mode: 'tabula', pages: usedPages } } } });
            } else {
              throw new Error('Extraction Tabula vide, bascule en OCR.');
            }
          } catch (e: any) {
            updateAnswer({ text: `\nTabula indisponible — heuristiques PDF (pdfjs)`, status: 'PENDING' });
            // Fallback to pdfjs text positioning heuristics for digital PDFs
            try {
              const pages = await extractDigitalPdfTablesWithPdfjs(pdfBuf, pagesBudget);
              const takePages = Math.min(pages.length, pagesBudget);
              for (let p = 0; p < takePages; p++) {
                const rows = pages[p];
                const title = `PDF${pi + 1}-Page${p + 1}`;
                sheets.push({ name: title, rows });
                consolidated.push(...rows);
              }
              usedPages = takePages;
              pagesBudget -= usedPages;
              updateStep({ stepId, stepStatus: 'PENDING', subSteps: { [`pdf-${pi + 1}`]: { status: 'COMPLETED', data: { mode: 'pdfjs', pages: usedPages } } } });
            } catch {
              updateAnswer({ text: `\nHeuristiques PDF indisponibles — utilisation de l\'OCR.`, status: 'PENDING' });
              const imgs = await rasterizePdfToImages(pdfBuf, pagesBudget);
              pageImages = imgs;
            }
          }
        } else {
          // Scanned or unknown -> rasterize and OCR
          try {
            const imgs = await rasterizePdfToImages(pdfBuf, pagesBudget);
            pageImages = imgs;
          } catch (e: any) {
            const msg = String(e?.message || e);
            if (/password|encrypt/i.test(msg)) {
              updateAnswer({ text: `\nLe PDF ${pi + 1} est chiffré/protégé. Ignoré.`, status: 'PENDING' });
            } else {
              updateAnswer({ text: `\nImpossible de traiter le PDF ${pi + 1}: ${msg}`, status: 'PENDING' });
            }
            pageImages = [];
          }
        }

        if (pageImages.length) {
          const take = Math.min(pageImages.length, pagesBudget);
          for (let p = 0; p < take; p++) {
            const pageNo = p + 1;
            updateAnswer({ text: `\nOCR de la page ${pageNo}/${take} du PDF ${pi + 1}…`, status: 'PENDING' });
            const rows = await ocrImageToRows(pageImages[p], FREE_OCR_LANGUAGES, Math.max(10000, Math.floor(FREE_OCR_TIMEOUT_MS / Math.max(1, FREE_OCR_MAX_PAGES))));
            const title = `PDF${pi + 1}-Page${pageNo}`;
            sheets.push({ name: title, rows });
            consolidated.push(...rows);
            pagesBudget -= 1;
            if (pagesBudget <= 0) break;
          }
          updateStep({ stepId, stepStatus: 'PENDING', subSteps: { [`pdf-${pi + 1}`]: { status: 'COMPLETED', data: { mode: 'ocr', pages: Math.min(pageImages.length, take) } } } as any });
        }

        if (pagesBudget <= 0) break;
      }
      updateStep({ stepId, stepStatus: 'COMPLETED', subSteps: {} });
    }

    // Process images (each image is treated as one page)
    if (pagesBudget > 0 && images.length > 0) {
      const stepId = nextStepId();
      updateStep({ stepId, text: `Traitement des images (${images.length})`, stepStatus: 'PENDING', subSteps: {} });
      const take = Math.min(images.length, pagesBudget);
      for (let i = 0; i < take; i++) {
        if (signal?.aborted) throw new Error('Opération annulée');
        updateAnswer({ text: `\nOCR de l\'image ${i + 1}/${take}…`, status: 'PENDING' });
        const rows = await ocrImageToRows(images[i], FREE_OCR_LANGUAGES, Math.max(10000, Math.floor(FREE_OCR_TIMEOUT_MS / Math.max(1, FREE_OCR_MAX_PAGES))));
        const title = `Image${i + 1}`;
        sheets.push({ name: title, rows });
        consolidated.push(...rows);
        pagesBudget -= 1;
        if (pagesBudget <= 0) break;
      }
      updateStep({ stepId, stepStatus: 'COMPLETED', subSteps: {} });
    }

    if (sheets.length === 0) {
      updateAnswer({ text: `Aucune donnée de tableau n\'a pu être extraite. Assurez‑vous que le document contient des tableaux clairs.`, status: 'COMPLETED' });
      updateStatus('COMPLETED');
      return 'NO_TABLES';
    }

    // Build outputs
    const { xlsxOut, csvOut } = await buildXlsxAndCsv({ sheets, consolidated, outBase });
    const xlsxFile = path.basename(xlsxOut);
    const csvFile = path.basename(csvOut);
    const xlsxUrl = `/api/exports/${xlsxFile}`;
    const csvUrl = `/api/exports/${csvFile}`;

    updateAnswer({
      text: `\nConversion terminée.\n\n• [Télécharger XLSX](${xlsxUrl})\n• [Télécharger CSV](${csvUrl})\n\nMode: 100% gratuit (Tabula/Tesseract). Pages traitées: ${FREE_OCR_MAX_PAGES - pagesBudget}/${FREE_OCR_MAX_PAGES}.`,
      status: 'COMPLETED',
    });
    updateStatus('COMPLETED');
    context?.update('answer', _ => `XLSX: ${xlsxUrl} | CSV: ${csvUrl}`);
    return { xlsx: xlsxUrl, csv: csvUrl };
  },
  onError: handleError,
  route: () => 'end',
});
