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

export async function GET(request: NextRequest) {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const windowParam = searchParams.get('window');
  const windowMs = parseWindowMs(windowParam);
  const now = new Date();
  const since = new Date(Date.now() - windowMs);
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

  // Build 7-day series (today and previous 6 days)
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const seriesOnline = await Promise.all(days.map(async (d) => {
    const end = endOfDay(d);
    const threshold = new Date(end.getTime() - (ONLINE_THRESHOLD_MS + ONLINE_FUDGE_MS));
    const sess = await prisma.session.findMany({
      where: { lastSeen: { gte: threshold, lte: end }, user: { isSuspended: false, deletedAt: null } },
      select: { userId: true },
    });
    return new Set(sess.map(s => s.userId)).size;
  }));

  const seriesSuspended = await Promise.all(days.map(async (d) => {
    const s = startOfDay(d); const e = endOfDay(d);
    return prisma.activityLog.count({ where: { action: ActivityAction.suspend, createdAt: { gte: s, lte: e } } });
  }));

  const seriesDeleted = await Promise.all(days.map(async (d) => {
    const s = startOfDay(d); const e = endOfDay(d);
    return prisma.user.count({ where: { deletedAt: { gte: s, lte: e } } });
  }));

  const seriesUnlock = await Promise.all(days.map(async (d) => {
    const s = startOfDay(d); const e = endOfDay(d);
    return prisma.activityLog.count({ where: { action: ActivityAction.unlock, createdAt: { gte: s, lte: e }, details: { path: ['previousReason'], equals: 'lockout_3_attempts' } as any } });
  }));

  const dates = days.map(d => startOfDay(d).toISOString().slice(0,10));

  return NextResponse.json({
    onlineCount,
    suspendedCount,
    deletedCount,
    reactivatedAfterLockoutCount: unlockCount,
    series: {
      dates,
      onlineCount: seriesOnline,
      suspendedCount: seriesSuspended,
      deletedCount: seriesDeleted,
      reactivatedAfterLockoutCount: seriesUnlock,
    },
  });
}
