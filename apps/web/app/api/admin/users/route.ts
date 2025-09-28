import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { requireAdmin } from '@/app/api/_lib/auth';
import bcrypt from 'bcryptjs';
import { ActivityAction } from '@prisma/client';
import { ONLINE_THRESHOLD_MS, ONLINE_FUDGE_MS } from '@/app/api/_lib/constants';

export async function GET(request: NextRequest) {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? undefined;
  const status = searchParams.get('status') ?? undefined; // online | offline | suspended | locked | deleted
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const skip = (page - 1) * limit;

  const sortKey = searchParams.get('sortKey') || undefined; // email | role | etat | createdAt | lastSeen | online
  const sortOrder = (searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  const where: any = {};
  if (q) where.email = { contains: q, mode: 'insensitive' };
  // exclude soft-deleted by default
  if (!status || (status !== 'deleted')) where.deletedAt = null;
  if (status === 'suspended') where.isSuspended = true;
  if (status === 'locked') where.isLocked = true;
  if (status === 'deleted') where.deletedAt = { not: null };
  if (status === 'offline') where.isSuspended = false; // filter online separately later
  if (status === 'online') where.isSuspended = false;

  // Build orderBy based on sortKey
  let orderBy: any = { createdAt: 'desc' };
  if (sortKey === 'email') orderBy = { email: sortOrder };
  else if (sortKey === 'role') orderBy = { role: sortOrder };
  else if (sortKey === 'createdAt') orderBy = { createdAt: sortOrder };
  else if (sortKey === 'etat') {
    orderBy = [
      { deletedAt: sortOrder },
      { isSuspended: sortOrder },
      { isLocked: sortOrder },
    ];
  } else if (sortKey === 'lastSeen' || sortKey === 'online') {
    orderBy = { sessions: { _max: { lastSeen: sortOrder } } } as any;
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { sessions: { orderBy: { lastSeen: 'desc' }, take: 1 } },
    }),
  ]);

  const now = Date.now();
  const onlineThreshold = now - (ONLINE_THRESHOLD_MS + ONLINE_FUDGE_MS);

  const items = users
    .map(u => {
      const s = u.sessions?.[0];
      const isOnline = s ? s.lastSeen.getTime() >= onlineThreshold : false;
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        isSuspended: u.isSuspended,
        isLocked: (u as any).isLocked ?? false,
        deletedAt: (u as any).deletedAt ?? null,
        createdAt: u.createdAt,
        lastSeen: s?.lastSeen ?? null,
        lastIp: s?.lastIp ?? null,
        lastCountry: s?.lastCountry ?? null,
        lastRegion: s?.lastRegion ?? null,
        lastCity: s?.lastCity ?? null,
        online: isOnline,
      } as any;
    })
    .filter(row => {
      if (!status) return true;
      if (status === 'online') return row.online;
      if (status === 'offline') return !row.online;
      if (status === 'suspended') return true; // already filtered by query above
      if (status === 'locked') return true; // already filtered by query above
      if (status === 'deleted') return true; // already filtered by query above
      return true;
    });

  return NextResponse.json({ page, limit, total, items });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  const body = await request.json().catch(() => ({}));
  const { email, password, role } = body;
  if (!email || !password) return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash, role: role === 'admin' ? 'admin' : 'user' } });

  await prisma.activityLog.create({
    data: { action: ActivityAction.account_created, actorId: admin.userId, userId: user.id },
  });

  return NextResponse.json({ id: user.id, email: user.email, role: user.role, isSuspended: user.isSuspended });
}
