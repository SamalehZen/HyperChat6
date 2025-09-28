import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { requireAdmin } from '@/app/api/_lib/auth';
import { ChatMode } from '@repo/shared/config';
import { ActivityAction } from '@prisma/client';
import { geolocation } from '@vercel/functions';
import { getIp } from '@/app/api/completion/utils';
import { publishUserAccessChanged } from '@/app/api/_lib/realtime-preferences';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin(request);
  const id = params.id;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  const allModes = Object.values(ChatMode);
  const allowed = (user as any).allowedChatModes ?? null;
  return NextResponse.json({ allowedChatModes: allowed, allModes });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const { allowedChatModes } = body as { allowedChatModes: string[] | null };

  const allModes = Object.values(ChatMode);
  if (allowedChatModes !== null && !Array.isArray(allowedChatModes)) {
    return NextResponse.json({ error: 'allowedChatModes doit être null ou un tableau' }, { status: 400 });
  }
  if (Array.isArray(allowedChatModes)) {
    const invalid = allowedChatModes.filter(m => !allModes.includes(m as any));
    if (invalid.length) {
      return NextResponse.json({ error: 'Modes invalides', invalid }, { status: 400 });
    }
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const prev = (user as any).allowedChatModes ?? null;
  const prevEffective: string[] = prev === null ? allModes : Array.isArray(prev) ? prev : allModes;
  const next = allowedChatModes ?? null;
  const nextEffective: string[] = next === null ? allModes : Array.isArray(next) ? next : allModes;

  const prevSet = new Set(prevEffective);
  const nextSet = new Set(nextEffective);
  const added = nextEffective.filter(m => !prevSet.has(m));
  const removed = prevEffective.filter(m => !nextSet.has(m));

  const gl = geolocation(request);
  const ip = getIp(request);

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { allowedChatModes: next } as any }),
    prisma.activityLog.create({
      data: {
        userId: id,
        actorId: admin.userId,
        action: ActivityAction.account_updated,
        details: { type: 'chat-mode-access', added, removed } as any,
        ip: ip ?? undefined,
        country: gl?.country ?? undefined,
        region: gl?.region ?? undefined,
        city: gl?.city ?? undefined,
      },
    }),
  ]);

  await publishUserAccessChanged(id);

  return NextResponse.json({ ok: true });
}