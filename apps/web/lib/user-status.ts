import { prisma } from '@repo/prisma';
import { clerkClient } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { getIp } from '../app/api/completion/utils';

export type LocalUser = Awaited<ReturnType<typeof getOrSyncLocalUser>>;

export async function getOrSyncLocalUser(clerkUserId: string) {
  let user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (user) return user;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkUserId);
  const username = deriveUsername(clerkUser);

  user = await prisma.user.upsert({
    where: { clerkUserId },
    update: {},
    create: {
      clerkUserId,
      username,
      status: 'ACTIVE',
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: 'SYSTEM',
      action: 'SYNC_USER',
      targetUserId: user.id,
      metadata: { source: 'overlay_auto_sync' } as any,
    },
  });

  return user;
}

function deriveUsername(clerkUser: any): string {
  if (clerkUser?.username) return String(clerkUser.username);
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
  if (email && typeof email === 'string') {
    const local = email.split('@')[0];
    if (local) return local;
  }
  const id = String(clerkUser?.id || Math.random().toString(36).slice(2));
  return `user_${id.slice(0, 6)}`;
}

export async function checkUserAccess(clerkUserId: string): Promise<{ ok: true; user: LocalUser } | { ok: false; status: 'BLOCKED'|'PAUSED'|'DELETED'; message: string; user: LocalUser | null } > {
  const user = await getOrSyncLocalUser(clerkUserId);
  if (!user) return { ok: false, status: 'DELETED', message: 'Compte introuvable', user: null } as any;
  switch (user.status) {
    case 'ACTIVE':
      return { ok: true, user };
    case 'BLOCKED':
      return { ok: false, status: 'BLOCKED', message: 'Compte bloqué', user };
    case 'PAUSED':
      return { ok: false, status: 'PAUSED', message: 'Compte en pause', user };
    case 'DELETED':
      return { ok: false, status: 'DELETED', message: 'Compte supprimé', user };
    default:
      return { ok: false, status: 'BLOCKED', message: 'Accès refusé', user } as any;
  }
}

export async function recordUserActivity(clerkUserId: string, req: NextRequest) {
  const user = await getOrSyncLocalUser(clerkUserId);
  const ip = getIp(req);
  const userAgent = req.headers.get('user-agent') || undefined;

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } }),
    prisma.ipLog.create({ data: { userId: user.id, ip: ip || 'unknown', userAgent } }),
  ]);
}

export function isOnline(lastSeen: Date | null | undefined): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff <= 5 * 60 * 1000;
}
