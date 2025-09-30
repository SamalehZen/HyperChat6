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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const windowSel = parseWindow(searchParams.get('window'));
  const userId = params.id;

  const bins = getBins(windowSel);
  const currentRange = { gte: bins[0].start, lte: bins[bins.length - 1].end } as const;

  const totals = await prisma.messageLog.aggregate({
    _sum: { promptTokens: true, completionTokens: true, costUsdCents: true },
    where: { createdAt: currentRange, userId },
  });

  const seriesDates = bins.map(b => b.label);
  const tokensPrompt: number[] = [];
  const tokensCompletion: number[] = [];
  const costUsd: number[] = [];

  for (const b of bins) {
    const a = await prisma.messageLog.aggregate({
      _sum: { promptTokens: true, completionTokens: true, costUsdCents: true },
      where: { createdAt: { gte: b.start, lte: b.end }, userId },
    });
    tokensPrompt.push(Number(a._sum?.promptTokens || 0));
    tokensCompletion.push(Number(a._sum?.completionTokens || 0));
    costUsd.push(Number(((a._sum?.costUsdCents || 0) / 100).toFixed(2)));
  }

  return NextResponse.json({
    window: windowSel,
    userId,
    totals: {
      promptTokens: Number(totals._sum?.promptTokens || 0),
      completionTokens: Number(totals._sum?.completionTokens || 0),
      costUsd: Number(((totals._sum?.costUsdCents || 0) / 100).toFixed(2)),
    },
    series: { dates: seriesDates, promptTokens: tokensPrompt, completionTokens: tokensCompletion, costUsd },
  });
}
