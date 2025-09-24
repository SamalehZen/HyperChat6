import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { createSessionForUser, getIp } from '@/app/api/_lib/auth';
import bcrypt from 'bcryptjs';
import { ActivityAction } from '@prisma/client';
import { geolocation } from '@vercel/functions';

const LOCK_MESSAGE = 'Votre compte a été désactivé après 3 tentatives incorrectes. Pour le réactiver, contactez l’administrateur.';
const RATE_LIMIT_MESSAGE = 'Trop de tentatives, réessayez dans une minute.';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
  }

  const gl = geolocation(request);
  const ip = getIp(request);

  await prisma.activityLog.create({
    data: {
      action: ActivityAction.login_attempt,
      ip: ip ?? undefined,
      country: gl?.country ?? undefined,
      region: gl?.region ?? undefined,
      city: gl?.city ?? undefined,
      details: { email }
    },
  });

  if (ip) {
    const since = new Date(Date.now() - 60_000);
    const attempts = await prisma.activityLog.count({
      where: {
        action: ActivityAction.login_attempt,
        ip,
        createdAt: { gte: since },
      },
    });
    if (attempts > 5) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await prisma.activityLog.create({
      data: {
        action: ActivityAction.login_failed,
        details: { email },
        ip: ip ?? undefined,
        country: gl?.country ?? undefined,
        region: gl?.region ?? undefined,
        city: gl?.city ?? undefined,
      },
    });
    return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
  }

  if (user.isSuspended) {
    return NextResponse.json({ error: 'Compte suspendu' }, { status: 403 });
  }

  if (user.isLocked) {
    return NextResponse.json({ errorCode: 'LOCKED', error: LOCK_MESSAGE }, { status: 403 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true, isLocked: true },
      });

      await tx.activityLog.create({
        data: {
          userId: user.id,
          actorId: user.id,
          action: ActivityAction.login_failed,
          ip: ip ?? undefined,
          country: gl?.country ?? undefined,
          region: gl?.region ?? undefined,
          city: gl?.city ?? undefined,
        },
      });

      let lockedNow = false;
      if (updated.failedLoginAttempts >= 3 && !updated.isLocked) {
        await tx.user.update({
          where: { id: user.id },
          data: { isLocked: true, lockedAt: new Date(), lockReason: 'lockout_3_attempts' },
        });
        await tx.activityLog.create({
          data: {
            userId: user.id,
            actorId: user.id,
            action: ActivityAction.lockout,
            details: { reason: 'lockout_3_attempts' },
            ip: ip ?? undefined,
            country: gl?.country ?? undefined,
            region: gl?.region ?? undefined,
            city: gl?.city ?? undefined,
          },
        });
        lockedNow = true;
      }

      return { failedLoginAttempts: updated.failedLoginAttempts, lockedNow };
    });

    if (result.lockedNow) {
      return NextResponse.json({ errorCode: 'LOCKED', error: LOCK_MESSAGE }, { status: 403 });
    }

    return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0 } });

  await createSessionForUser(user.id, request);

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
