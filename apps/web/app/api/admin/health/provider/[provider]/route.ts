import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/_lib/auth';
import { prisma } from '@repo/prisma';

const DJIBOUTI_TZ_OFFSET_MINUTES = 180; // UTC+03

function parseWindow(param: string | null): '24h' | '7j' | '30j' {
  if (!param) return '7j';
  const p = (param || '').toLowerCase();
  if (p === '24h') return '24h';
  if (p === '7d' || p === '7j') return '7j';
  if (p === '30d' || p === '30j') return '30j';
  return '7j';
}

function addHours(d: Date, n: number) { const x = new Date(d); x.setHours(x.getHours()+n); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function shiftToTZ(d: Date) { return new Date(d.getTime() + DJIBOUTI_TZ_OFFSET_MINUTES * 60 * 1000); }
function shiftFromTZ(d: Date) { return new Date(d.getTime() - DJIBOUTI_TZ_OFFSET_MINUTES * 60 * 1000); }

function getBins(windowSel: '24h'|'7j'|'30j') {
  const now = new Date();
  const nowTz = shiftToTZ(now);
  const bins: { start: Date; end: Date; label: string }[] = [];
  if (windowSel === '24h') {
    for (let i = 23; i >= 0; i--) {
      const endTz = addHours(nowTz, -i);
      const startTz = addHours(endTz, -1);
      bins.push({ start: shiftFromTZ(startTz), end: shiftFromTZ(endTz), label: startTz.toISOString() });
    }
  } else {
    const days = windowSel === '7j' ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const dTz = addDays(nowTz, -i);
      const startTz = startOfDay(dTz);
      const endTz = endOfDay(dTz);
      bins.push({ start: shiftFromTZ(startTz), end: shiftFromTZ(endTz), label: startTz.toISOString().slice(0, 10) });
    }
  }
  return bins;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a,b)=>a-b);
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

export async function GET(request: NextRequest, { params }: { params: { provider: string } }) {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const windowSel = parseWindow(searchParams.get('window'));
  const providerKey = decodeURIComponent(params.provider || '').toLowerCase();

  const bins = getBins(windowSel);
  const range = { gte: bins[0].start, lte: bins[bins.length - 1].end } as const;

  const rows = await prisma.messageLog.findMany({
    where: { provider: providerKey, createdAt: range },
    select: { latencyMs: true, status: true, errorCode: true },
  });

  const total = rows.length;
  const completed = rows.filter(r => r.status === 'COMPLETED');
  const errors = rows.filter(r => r.status === 'ERROR');
  const aborted = rows.filter(r => r.status === 'ABORTED');

  const latencies = completed.map(r => r.latencyMs);
  const p50 = Math.round(percentile(latencies, 0.5));
  const p90 = Math.round(percentile(latencies, 0.9));
  const p95 = Math.round(percentile(latencies, 0.95));
  const p99 = Math.round(percentile(latencies, 0.99));

  // Histogram buckets (ms)
  const edges = [0, 250, 500, 1000, 2000, 4000, 8000];
  const buckets = edges.map((start, i) => {
    const end = edges[i+1] ?? Infinity;
    const label = isFinite(end) ? `${start}-${end} ms` : `${start}+ ms`;
    const count = latencies.filter(v => v >= start && (isFinite(end) ? v < end : true)).length;
    return { label, start, end: isFinite(end) ? end : null, count };
  });

  const errorByStatus: Record<string, number> = {
    COMPLETED: completed.length,
    ERROR: errors.length,
    ABORTED: aborted.length,
  };

  const errorByCode: Record<string, number> = {};
  [...errors, ...aborted].forEach(r => {
    const key = r.errorCode || 'unknown';
    errorByCode[key] = (errorByCode[key] || 0) + 1;
  });

  const seriesDates: string[] = bins.map(b => b.label);
  const seriesCompleted: number[] = [];
  const seriesErrors: number[] = [];
  const seriesAborted: number[] = [];
  for (const b of bins) {
    const inBin = rows.filter(r => (r as any).createdAt ? ((r as any).createdAt >= b.start && (r as any).createdAt <= b.end) : true);
    // We didn't select createdAt to reduce load; re-query counts per bin for accurate series
    const [cCount, eCount, aCount] = await Promise.all([
      prisma.messageLog.count({ where: { provider: providerKey, createdAt: { gte: b.start, lte: b.end }, status: 'COMPLETED' } }),
      prisma.messageLog.count({ where: { provider: providerKey, createdAt: { gte: b.start, lte: b.end }, status: 'ERROR' } }),
      prisma.messageLog.count({ where: { provider: providerKey, createdAt: { gte: b.start, lte: b.end }, status: 'ABORTED' } }),
    ]);
    seriesCompleted.push(cCount);
    seriesErrors.push(eCount);
    seriesAborted.push(aCount);
  }

  return NextResponse.json({
    window: windowSel,
    provider: { key: providerKey },
    totals: { total, completed: completed.length, error: errors.length, aborted: aborted.length },
    latency: { p50, p90, p95, p99, buckets },
    errors: { byStatus: errorByStatus, byCode: errorByCode },
    series: { dates: seriesDates, completed: seriesCompleted, errors: seriesErrors, aborted: seriesAborted },
  });
}
