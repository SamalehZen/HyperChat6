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

function parseLimit(param: string | null): number {
  const n = parseInt(param || '3', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(10, n) : 3;
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

export async function GET(request: NextRequest) {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const windowSel = parseWindow(searchParams.get('window'));
  const limit = parseLimit(searchParams.get('limit'));

  const bins = getBins(windowSel);
  const currentRange = { gte: bins[0].start, lte: bins[bins.length - 1].end } as const;

  // Aggregate totals per user (exclude null userId)
  const totals = await prisma.messageLog.groupBy({
    by: ['userId'],
    where: { createdAt: currentRange, userId: { not: null } },
    _sum: { promptTokens: true, completionTokens: true, costUsdCents: true },
  } as any);

  const rows = (totals as any[])
    .map(r => ({
      userId: r.userId as string,
      promptTokens: Number(r._sum?.promptTokens || 0),
      completionTokens: Number(r._sum?.completionTokens || 0),
      costUsd: Number(((r._sum?.costUsdCents || 0) / 100).toFixed(2)),
    }))
    .sort((a,b) => b.costUsd - a.costUsd)
    .slice(0, limit);

  // Build series per selected users
  const selected = rows.map(r => r.userId);
  const seriesDates = bins.map(b => b.label);
  const seriesByUser: Record<string, { tokens: number[]; costUsd: number[] }> = {};
  for (const uid of selected) {
    seriesByUser[uid] = { tokens: [], costUsd: [] };
  }
  for (const b of bins) {
    const g = await prisma.messageLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: b.start, lte: b.end }, userId: { in: selected } },
      _sum: { promptTokens: true, completionTokens: true, costUsdCents: true },
    } as any);
    const map: Record<string, { pt: number; ct: number; cost: number }> = {};
    (g as any[]).forEach(r => {
      map[r.userId] = {
        pt: Number(r._sum?.promptTokens || 0),
        ct: Number(r._sum?.completionTokens || 0),
        cost: Number(((r._sum?.costUsdCents || 0) / 100).toFixed(2)),
      };
    });
    selected.forEach(uid => {
      const rec = map[uid] || { pt: 0, ct: 0, cost: 0 };
      seriesByUser[uid].tokens.push(rec.pt + rec.ct);
      seriesByUser[uid].costUsd.push(rec.cost);
    });
  }

  const top = rows.map(r => ({ ...r, series: { dates: seriesDates, tokens: seriesByUser[r.userId].tokens, costUsd: seriesByUser[r.userId].costUsd } }));

  return NextResponse.json({ window: windowSel, top });
}
