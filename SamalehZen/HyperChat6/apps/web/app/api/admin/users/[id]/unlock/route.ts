import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { requireAdmin } from '@/app/api/_lib/auth';
import { ActivityAction } from '@prisma/client';
import { geolocation } from '@vercel/functions';
import { getIp } from '@/app/api/completion/utils';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  const id = params.id;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const gl = geolocation(request);
  const ip = getIp(request);

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        isLocked: false,
        lockedAt: null,
        lockReason: null,
      },
    }),
  ]);

  try {
    await prisma.activityLog.create({
      data: {
        userId: id,
        actorId: admin.userId,
        action: ActivityAction.unlock,
        details: user.lockReason ? { previousLockReason: user.lockReason } : undefined,
        ip: ip ?? undefined,
        country: gl?.country ?? undefined,
        region: gl?.region ?? undefined,
        city: gl?.city ?? undefined,
      },
    });
  } catch (_) {
    // ignore logging errors
  }

  return NextResponse.json({ ok: true });
}
