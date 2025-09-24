import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { requireAdmin } from '@/app/api/_lib/auth';
import bcrypt from 'bcryptjs';
import { ActivityAction } from '@prisma/client';

export async function GET(request: NextRequest) {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? undefined;
  const status = searchParams.get('status') ?? undefined; // online | offline | suspended
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (q) where.email = { contains: q, mode: 'insensitive' };
  if (status === 'suspended') where.isSuspended = true;
  if (status === 'offline') where.isSuspended = false; // filter online separately later
  if (status === 'online') where.isSuspended = false;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { sessions: { orderBy: { lastSeen: 'desc' }, take: 1 } },
    }),
  ]);

  const now = Date.now();
  const onlineThreshold = now - 120_000;

  const items = users
    .map(u => {
      const s = u.sessions?.[0];
      const isOnline = s ? s.lastSeen.getTime() >= onlineThreshold : false;
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        isSuspended: u.isSuspended,
        createdAt: u.createdAt,
        lastSeen: s?.lastSeen ?? null,
        lastIp: s?.lastIp ?? null,
        lastCountry: s?.lastCountry ?? null,
        lastRegion: s?.lastRegion ?? null,
        lastCity: s?.lastCity ?? null,
        online: isOnline,
      };
    })
    .filter(row => {
      if (!status) return true;
      if (status === 'online') return row.online;
      if (status === 'offline') return !row.online;
      if (status === 'suspended') return true; // already filtered by query above
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
