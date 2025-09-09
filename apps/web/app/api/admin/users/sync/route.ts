import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { readAdminSessionFromRequest, validateCsrf } from '@/lib/admin-auth';
import { clerkClient } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await readAdminSessionFromRequest(req);
  const contentType = req.headers.get('content-type') || '';
  let csrf: string | undefined;
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    csrf = body.csrf;
  } else {
    const form = await req.formData();
    csrf = String(form.get('csrf') || '');
  }
  if (!session || !validateCsrf(session, csrf)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = 100;
  let offset = 0;
  let total = 0;

  while (true) {
    const page = await clerkClient.users.getUserList({ limit, offset });
    const users = (page as any)?.data ?? (Array.isArray(page) ? page : []);
    if (!users.length) break;

    for (const u of users) {
      const clerkUserId = String(u.id);
      const username = String(u.username || (u.emailAddresses?.[0]?.emailAddress?.split('@')[0] || `user_${clerkUserId.slice(0,6)}`));
      const local = await prisma.user.upsert({
        where: { clerkUserId },
        update: { username },
        create: { clerkUserId, username, status: 'ACTIVE' },
      });
      await prisma.auditLog.create({
        data: {
          actor: 'SYSTEM',
          action: 'SYNC_USER',
          targetUserId: local.id,
        },
      });
      total += 1;
    }

    offset += users.length;
    if (users.length < limit) break;
  }

  return NextResponse.json({ ok: true, count: total });
}
