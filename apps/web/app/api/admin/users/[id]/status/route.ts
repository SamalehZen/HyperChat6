import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { readAdminSessionFromRequest, validateCsrf } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await readAdminSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = req.headers.get('content-type') || '';
  let status = '' as 'ACTIVE'|'BLOCKED'|'PAUSED'|'DELETED';
  let csrf: string | undefined;
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    status = body.status;
    csrf = body.csrf;
  } else {
    const form = await req.formData();
    status = String(form.get('status') || '') as any;
    csrf = String(form.get('csrf') || '');
  }

  if (!validateCsrf(session, csrf)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  if (!['ACTIVE','BLOCKED','PAUSED','DELETED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const clerkUserId = params.id;
  const local = await prisma.user.upsert({
    where: { clerkUserId },
    update: { status },
    create: { clerkUserId, username: clerkUserId, status },
  });

  let action: 'BLOCK'|'PAUSE'|'UNBLOCK'|'UPDATE_STATUS' = 'UPDATE_STATUS';
  if (status === 'BLOCKED') action = 'BLOCK';
  else if (status === 'PAUSED') action = 'PAUSE';
  else if (status === 'ACTIVE') action = 'UNBLOCK';

  await prisma.auditLog.create({
    data: {
      actor: 'ADMIN',
      action,
      targetUserId: local.id,
      metadata: { status } as any,
    },
  });

  return NextResponse.json({ ok: true, user: local });
}
