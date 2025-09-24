import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { requireAdmin } from '../../../_lib/auth';
import bcrypt from 'bcryptjs';
import { ActivityAction, Role } from '@prisma/client';
import { geolocation } from '@vercel/functions';
import { getIp } from '../../../completion/utils';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const { action, password, role } = body as { action: string; password?: string; role?: Role };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const gl = geolocation(request);
  const ip = getIp(request);

  if (action === 'reset_password') {
    if (!password) return NextResponse.json({ error: 'Mot de passe requis' }, { status: 400 });
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { passwordHash } }),
      prisma.session.deleteMany({ where: { userId: id } }),
      prisma.activityLog.create({
        data: {
          userId: id,
          actorId: admin.userId,
          action: ActivityAction.password_reset,
          ip: ip ?? undefined,
          country: gl?.country ?? undefined,
          region: gl?.region ?? undefined,
          city: gl?.city ?? undefined,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (action === 'suspend') {
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { isSuspended: true } }),
      prisma.session.deleteMany({ where: { userId: id } }),
      prisma.activityLog.create({ data: { userId: id, actorId: admin.userId, action: ActivityAction.suspend, ip: ip ?? undefined, country: gl?.country ?? undefined, region: gl?.region ?? undefined, city: gl?.city ?? undefined } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (action === 'unsuspend') {
    await prisma.activityLog.create({ data: { userId: id, actorId: admin.userId, action: ActivityAction.unsuspend, ip: ip ?? undefined, country: gl?.country ?? undefined, region: gl?.region ?? undefined, city: gl?.city ?? undefined } });
    await prisma.user.update({ where: { id }, data: { isSuspended: false } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'update_role') {
    if (!role || (role !== 'admin' && role !== 'user')) return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    await prisma.user.update({ where: { id }, data: { role } });
    await prisma.activityLog.create({ data: { userId: id, actorId: admin.userId, action: ActivityAction.account_updated, ip: ip ?? undefined, country: gl?.country ?? undefined, region: gl?.region ?? undefined, city: gl?.city ?? undefined } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  const id = params.id;

  const gl = geolocation(request);
  const ip = getIp(request);

  await prisma.activityLog.create({ data: { userId: id, actorId: admin.userId, action: ActivityAction.delete, ip: ip ?? undefined, country: gl?.country ?? undefined, region: gl?.region ?? undefined, city: gl?.city ?? undefined } });

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
