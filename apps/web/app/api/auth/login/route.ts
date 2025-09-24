import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { createSessionForUser } from '@/app/api/_lib/auth';
import bcrypt from 'bcryptjs';
import { ActivityAction } from '@prisma/client';
import { geolocation } from '@vercel/functions';
import { getIp } from '@/app/api/completion/utils';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
  if ((user as any).deletedAt) return NextResponse.json({ error: 'Compte supprimé' }, { status: 410 });
  if ((user as any).isLocked) return NextResponse.json({ error: 'Compte verrouillé' }, { status: 423 });
  if (user.isSuspended) return NextResponse.json({ error: 'Compte suspendu' }, { status: 403 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });

  const { token, expiresAt } = await createSessionForUser(user.id, request);

  const gl = geolocation(request);
  const ip = getIp(request);
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      actorId: user.id,
      action: ActivityAction.login,
      ip: ip ?? undefined,
      country: gl?.country ?? undefined,
      region: gl?.region ?? undefined,
      city: gl?.city ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
