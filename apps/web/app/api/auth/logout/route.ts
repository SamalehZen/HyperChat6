import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { clearSessionCookie, getSession } from '../../_lib/auth';
import { ActivityAction } from '@prisma/client';
import { geolocation } from '@vercel/functions';
import { getIp } from '../../completion/utils';

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (session) {
    await prisma.session.deleteMany({ where: { token: session.token } });

    const gl = geolocation(request);
    const ip = getIp(request);
    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        actorId: session.userId,
        action: ActivityAction.logout,
        ip: ip ?? undefined,
        country: gl?.country ?? undefined,
        region: gl?.region ?? undefined,
        city: gl?.city ?? undefined,
      },
    });
  }

  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
