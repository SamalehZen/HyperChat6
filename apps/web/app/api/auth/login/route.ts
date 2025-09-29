import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { createSessionForUser, getIp } from '@/app/api/_lib/auth';
import bcrypt from 'bcryptjs';
import { ActivityAction } from '@prisma/client';
import { geolocation } from '@vercel/functions';

const LOCK_MESSAGE = 'Votre compte a été désactivé après 3 tentatives incorrectes. Pour le réactiver, contactez l’administrateur.';
const RATE_LIMIT_MESSAGE = 'Trop de tentatives, réessayez dans une minute.';

async function safeLog(data: { userId?: string; actorId?: string; action: ActivityAction; details?: any; ip?: string | null; country?: string | null; region?: string | null; city?: string | null; }) {
  try {
    await prisma.activityLog.create({ data: { ...data, ip: data.ip ?? undefined, country: data.country ?? undefined, region: data.region ?? undefined, city: data.city ?? undefined } });
  } catch (_) {
    // Swallow logging errors (e.g., enum values not yet migrated) to avoid breaking auth
  }
}

export async function POST(request: NextRequest) {
  const { identifier, email, username, password } = await request.json().catch(() => ({}));
  const id = (identifier ?? email ?? username)?.trim();
  if (!id || !password) {
    return NextResponse.json({ error: 'Identifiant et mot de passe requis' }, { status: 400 });
  }

  const gl = geolocation(request);
  const ip = getIp(request);

  await safeLog({
    action: ActivityAction.login_attempt,
    ip,
    country: gl?.country ?? null,
    region: gl?.region ?? null,
    city: gl?.city ?? null,
    details: { identifier: id },
  });

  if (ip) {
    const since = new Date(Date.now() - 60_000);
    try {
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
    } catch (_) {
      // If enum not migrated yet, skip rate limiting rather than break auth
    }
  }

  // Si l'identifiant contient un '@', on considère que c'est un email; sinon on utilise le champ email comme username stocké
  const user = await prisma.user.findUnique({ where: { email: id } });
  if (!user) {
    await safeLog({ action: ActivityAction.login_failed, details: { identifier: id }, ip, country: gl?.country ?? null, region: gl?.region ?? null, city: gl?.city ?? null });
    return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
  }
  if ((user as any).deletedAt) return NextResponse.json({ error: 'Compte supprimé' }, { status: 410 });
  if (user.isSuspended) return NextResponse.json({ error: 'Compte suspendu' }, { status: 403 });
  if (user.isLocked) return NextResponse.json({ errorCode: 'LOCKED', error: LOCK_MESSAGE }, { status: 403 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true, isLocked: true },
      });

      // Best-effort logging inside transaction. If this fails due to enum, ignore.
      try {
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
      } catch (_) {}

      let lockedNow = false;
      if (updated.failedLoginAttempts >= 3 && !updated.isLocked) {
        await tx.user.update({
          where: { id: user.id },
          data: { isLocked: true, lockedAt: new Date(), lockReason: 'lockout_3_attempts' },
        });
        try {
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
        } catch (_) {}
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

  await safeLog({
    userId: user.id,
    actorId: user.id,
    action: ActivityAction.login,
    ip,
    country: gl?.country ?? null,
    region: gl?.region ?? null,
    city: gl?.city ?? null,
  });

  return NextResponse.json({ ok: true });
}
