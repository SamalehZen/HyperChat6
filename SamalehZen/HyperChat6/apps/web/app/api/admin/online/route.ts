import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { requireAdmin } from '@/app/api/_lib/auth';
import { ONLINE_THRESHOLD_MS, ONLINE_FUDGE_MS } from '@/app/api/_lib/constants';

export async function GET(request: NextRequest) {
  await requireAdmin(request);
  const threshold = new Date(Date.now() - (ONLINE_THRESHOLD_MS + ONLINE_FUDGE_MS));

  const sessions = await prisma.session.findMany({
    where: { lastSeen: { gte: threshold } },
    include: { user: true },
    orderBy: { lastSeen: 'desc' },
  });

  const byUser = new Map<string, typeof sessions[number]>();
  for (const s of sessions) {
    if (!s.user || s.user.isSuspended || (s.user as any).deletedAt) continue;
    if (!byUser.has(s.userId)) byUser.set(s.userId, s);
  }

  const items = Array.from(byUser.values()).map(s => ({
    userId: s.userId,
    email: s.user?.email,
    role: s.user?.role,
    lastSeen: s.lastSeen,
    lastIp: s.lastIp,
    lastCountry: s.lastCountry,
    lastRegion: s.lastRegion,
    lastCity: s.lastCity,
  }));

  return NextResponse.json({ items });
}
