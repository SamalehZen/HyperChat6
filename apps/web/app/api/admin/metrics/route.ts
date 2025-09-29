import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { requireAdmin } from '@/app/api/_lib/auth';
import { ONLINE_THRESHOLD_MS, ONLINE_FUDGE_MS } from '@/app/api/_lib/constants';
import { ActivityAction } from '@prisma/client';

function parseWindowMs(param: string | null): number {
  if (!param) return 24 * 60 * 60 * 1000;
  const m = param.trim().toLowerCase();
  if (m.endsWith('h')) return parseInt(m) * 60 * 60 * 1000;
  if (m.endsWith('d')) return parseInt(m) * 24 * 60 * 60 * 1000;
  const n = parseInt(m);
  return isFinite(n) && n > 0 ? n : 24 * 60 * 60 * 1000;
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function addHours(d: Date, n: number) { const x = new Date(d); x.setHours(x.getHours()+n); return x; }

export async function GET(request: NextRequest) {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const windowParam = searchParams.get('window');
  const windowMs = parseWindowMs(windowParam);
  const now = new Date();
  const since = new Date(Date.now() - windowMs);
  const prevSince = new Date(since.getTime() - windowMs);
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
        createdAt: { gte: since },
        details: { path: ['previousReason'], equals: 'lockout_3_attempts' } as any,
      },
    }),
  ]);

  const onlineCount = new Set(sessions.map(s => s.userId)).size;

  // Build series based on window (24h -> hourly, otherwise daily)
  const bins: { start: Date; end: Date; label: string }[] = [];
  if (windowMs <= 24 * 60 * 60 * 1000) {
    // hourly bins
    for (let i = 23; i >= 0; i--) {
      const end = addHours(now, -i);
      const start = addHours(end, -1);
      bins.push({ start, end, label: start.toISOString() });
    }
  } else {
    // daily bins
    const days = Math.round(windowMs / (24 * 60 * 60 * 1000));
    for (let i = days - 1; i >= 0; i--) {
      const d = addDays(now, -i);
      bins.push({ start: startOfDay(d), end: endOfDay(d), label: startOfDay(d).toISOString().slice(0, 10) });
    }
  }

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

  // Previous window totals
  const prevBins = bins.map(b => ({ start: new Date(b.start.getTime() - windowMs), end: new Date(b.end.getTime() - windowMs) }));
  const prevSuspended = await Promise.all(prevBins.map(b => prisma.activityLog.count({ where: { action: ActivityAction.suspend, createdAt: { gte: b.start, lte: b.end } } })));
  const prevDeleted = await Promise.all(prevBins.map(b => prisma.user.count({ where: { deletedAt: { gte: b.start, lte: b.end } } })));
  const prevUnlock = await Promise.all(prevBins.map(b => prisma.activityLog.count({ where: { action: ActivityAction.unlock, createdAt: { gte: b.start, lte: b.end }, details: { path: ['previousReason'], equals: 'lockout_3_attempts' } as any } })));
  const prevOnline = await Promise.all(prevBins.map(async (b) => {
    const threshold = new Date(b.end.getTime() - (ONLINE_THRESHOLD_MS + ONLINE_FUDGE_MS));
    const sess = await prisma.session.findMany({
      where: { lastSeen: { gte: threshold, lte: b.end }, user: { isSuspended: false, deletedAt: null } },
      select: { userId: true },
    });
    return new Set(sess.map(s => s.userId)).size;
  }));

  const dates = bins.map(b => b.label);

  return NextResponse.json({
    window: windowParam || '24h',
    onlineCount,
    totals: {
      suspended: seriesSuspended.reduce((a,b)=>a+b,0),
      deleted: seriesDeleted.reduce((a,b)=>a+b,0),
      unlock: seriesUnlock.reduce((a,b)=>a+b,0),
      onlineAvg: Math.round(seriesOnline.reduce((a,b)=>a+b,0) / Math.max(1, seriesOnline.length)),
    },
    previousTotals: {
      suspended: prevSuspended.reduce((a,b)=>a+b,0),
      deleted: prevDeleted.reduce((a,b)=>a+b,0),
      unlock: prevUnlock.reduce((a,b)=>a+b,0),
      onlineAvg: Math.round(prevOnline.reduce((a,b)=>a+b,0) / Math.max(1, prevOnline.length)),
    },
    series: {
      dates,
      onlineCount: seriesOnline,
      suspendedCount: seriesSuspended,
      deletedCount: seriesDeleted,
      reactivatedAfterLockoutCount: seriesUnlock,
    },
  });
}
