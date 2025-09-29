import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { requireAdmin } from '@/app/api/_lib/auth';
import { ONLINE_THRESHOLD_MS, ONLINE_FUDGE_MS } from '@/app/api/_lib/constants';
import { ActivityAction } from '@prisma/client';

const DJIBOUTI_TZ_OFFSET_MINUTES = 180; // UTC+03

function parseWindowMs(param: string | null): { ms: number; label: '24h' | '7j' | '30j' } {
  if (!param) return { ms: 7 * 24 * 60 * 60 * 1000, label: '7j' };
  const m = param.trim().toLowerCase();
  if (m === '24h') return { ms: 24 * 60 * 60 * 1000, label: '24h' };
  if (m === '7d' || m === '7j') return { ms: 7 * 24 * 60 * 60 * 1000, label: '7j' };
  if (m === '30d' || m === '30j') return { ms: 30 * 24 * 60 * 60 * 1000, label: '30j' };
  if (m.endsWith('h')) return { ms: parseInt(m) * 60 * 60 * 1000, label: '24h' };
  if (m.endsWith('d') || m.endsWith('j')) {
    const days = parseInt(m);
    return { ms: days * 24 * 60 * 60 * 1000, label: (days >= 30 ? '30j' : '7j') } as any;
  }
  return { ms: 7 * 24 * 60 * 60 * 1000, label: '7j' };
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function addHours(d: Date, n: number) { const x = new Date(d); x.setHours(x.getHours()+n); return x; }

function shiftToTZ(d: Date) { return new Date(d.getTime() + DJIBOUTI_TZ_OFFSET_MINUTES * 60 * 1000); }
function shiftFromTZ(d: Date) { return new Date(d.getTime() - DJIBOUTI_TZ_OFFSET_MINUTES * 60 * 1000); }

export async function GET(request: NextRequest) {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const windowParam = searchParams.get('window');
  const { ms: windowMs, label: windowLabel } = parseWindowMs(windowParam);
  const now = new Date();
  const nowTz = shiftToTZ(now);

  // Build bins with TZ-aware boundaries (hourly for 24h, daily for 7j/30j)
  const bins: { start: Date; end: Date; label: string }[] = [];
  if (windowLabel === '24h') {
    for (let i = 23; i >= 0; i--) {
      const endTz = addHours(nowTz, -i);
      const startTz = addHours(endTz, -1);
      bins.push({ start: shiftFromTZ(startTz), end: shiftFromTZ(endTz), label: startTz.toISOString() });
    }
  } else {
    const days = Math.round(windowMs / (24 * 60 * 60 * 1000));
    for (let i = days - 1; i >= 0; i--) {
      const dTz = addDays(nowTz, -i);
      const startTz = startOfDay(dTz);
      const endTz = endOfDay(dTz);
      bins.push({ start: shiftFromTZ(startTz), end: shiftFromTZ(endTz), label: startTz.toISOString().slice(0, 10) });
    }
  }

  const onlineThresholdDate = new Date(Date.now() - (ONLINE_THRESHOLD_MS + ONLINE_FUDGE_MS));

  const [sessions, suspendedCount, deletedCount, unlockCount] = await Promise.all([
    prisma.session.findMany({
      where: { lastSeen: { gte: onlineThresholdDate }, user: { isSuspended: false, deletedAt: null } },
      select: { userId: true },
    }),
    prisma.user.count({ where: { isSuspended: true, deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: { not: null } } }),
    prisma.activityLog.count({
      where: {
        action: ActivityAction.unlock,
        createdAt: { gte: bins[0].start, lte: bins[bins.length-1].end },
        details: { path: ['previousReason'], equals: 'lockout_3_attempts' } as any,
      },
    }),
  ]);

  const onlineCount = new Set(sessions.map(s => s.userId)).size;

  const seriesOnline = await Promise.all(bins.map(async (b) => {
    const threshold = new Date(b.end.getTime() - (ONLINE_THRESHOLD_MS + ONLINE_FUDGE_MS));
    const sess = await prisma.session.findMany({
      where: { lastSeen: { gte: threshold, lte: b.end }, user: { isSuspended: false, deletedAt: null } },
      select: { userId: true },
    });
    return new Set(sess.map(s => s.userId)).size;
  }));

  const seriesSuspended = await Promise.all(bins.map(async (b) => {
    return prisma.activityLog.count({ where: { action: ActivityAction.suspend, createdAt: { gte: b.start, lte: b.end } } });
  }));

  const seriesDeleted = await Promise.all(bins.map(async (b) => {
    return prisma.user.count({ where: { deletedAt: { gte: b.start, lte: b.end } } });
  }));

  const seriesUnlock = await Promise.all(bins.map(async (b) => {
    return prisma.activityLog.count({ where: { action: ActivityAction.unlock, createdAt: { gte: b.start, lte: b.end }, details: { path: ['previousReason'], equals: 'lockout_3_attempts' } as any } });
  }));

  // Usage by mode - totals in current and previous windows, plus time series per bin
  const currentRange = { gte: bins[0].start, lte: bins[bins.length - 1].end } as const;
  const prevBins = bins.map(b => ({ start: new Date(b.start.getTime() - windowMs), end: new Date(b.end.getTime() - windowMs) }));
  const prevRange = { gte: prevBins[0].start, lte: prevBins[prevBins.length - 1].end } as const;

  const usageTotalsRows = await prisma.messageLog.groupBy({
    by: ['mode'],
    where: { createdAt: currentRange, NOT: { status: 'ABORTED' } as any },
    _count: { _all: true },
  } as any);
  const prevUsageTotalsRows = await prisma.messageLog.groupBy({
    by: ['mode'],
    where: { createdAt: prevRange, NOT: { status: 'ABORTED' } as any },
    _count: { _all: true },
  } as any);

  const allModes = Array.from(new Set([...(usageTotalsRows as any[]).map(r => r.mode), ...(prevUsageTotalsRows as any[]).map(r => r.mode)]));
  const usageTotals: Record<string, number> = {};
  const usagePrevTotals: Record<string, number> = {};
  (usageTotalsRows as any[]).forEach(r => { usageTotals[r.mode] = r._count._all; });
  (prevUsageTotalsRows as any[]).forEach(r => { usagePrevTotals[r.mode] = r._count._all; });

  const usageSeriesModes: Record<string, number[]> = {};
  allModes.forEach(m => usageSeriesModes[m] = []);
  for (const b of bins) {
    const rows = await prisma.messageLog.groupBy({
      by: ['mode'],
      where: { createdAt: { gte: b.start, lte: b.end }, NOT: { status: 'ABORTED' } as any },
      _count: { _all: true },
    } as any);
    const map: Record<string, number> = {};
    (rows as any[]).forEach(r => { map[r.mode] = r._count._all; });
    allModes.forEach(m => usageSeriesModes[m].push(map[m] || 0));
  }

  const dates = bins.map(b => b.label);

  return NextResponse.json({
    window: windowLabel,
    onlineCount,
    totals: {
      suspended: seriesSuspended.reduce((a,b)=>a+b,0),
      deleted: seriesDeleted.reduce((a,b)=>a+b,0),
      unlock: seriesUnlock.reduce((a,b)=>a+b,0),
      onlineAvg: Math.round(seriesOnline.reduce((a,b)=>a+b,0) / Math.max(1, seriesOnline.length)),
    },
    previousTotals: {
      suspended: prevBins.length ? (await Promise.all(prevBins.map(b => prisma.activityLog.count({ where: { action: ActivityAction.suspend, createdAt: { gte: b.start, lte: b.end } } })))).reduce((a,b)=>a+b,0) : 0,
      deleted: prevBins.length ? (await Promise.all(prevBins.map(b => prisma.user.count({ where: { deletedAt: { gte: b.start, lte: b.end } } })))).reduce((a,b)=>a+b,0) : 0,
      unlock: prevBins.length ? (await Promise.all(prevBins.map(b => prisma.activityLog.count({ where: { action: ActivityAction.unlock, createdAt: { gte: b.start, lte: b.end }, details: { path: ['previousReason'], equals: 'lockout_3_attempts' } as any } })))).reduce((a,b)=>a+b,0) : 0,
      onlineAvg: Math.round((await Promise.all(prevBins.map(async (b) => {
        const threshold = new Date(b.end.getTime() - (ONLINE_THRESHOLD_MS + ONLINE_FUDGE_MS));
        const sess = await prisma.session.findMany({
          where: { lastSeen: { gte: threshold, lte: b.end }, user: { isSuspended: false, deletedAt: null } },
          select: { userId: true },
        });
        return new Set(sess.map(s => s.userId)).size;
      }))).reduce((a,b)=>a+b,0) / Math.max(1, prevBins.length)),
    },
    series: {
      dates,
      onlineCount: seriesOnline,
      suspendedCount: seriesSuspended,
      deletedCount: seriesDeleted,
      reactivatedAfterLockoutCount: seriesUnlock,
    },
    usageByMode: {
      totals: usageTotals,
      previousTotals: usagePrevTotals,
      series: { dates, modes: usageSeriesModes },
    },
  });
}
