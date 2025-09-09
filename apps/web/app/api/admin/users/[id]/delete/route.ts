import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { readAdminSessionFromRequest, validateCsrf } from '@/lib/admin-auth';
import { clerkClient } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await readAdminSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = req.headers.get('content-type') || '';
  let csrf: string | undefined;
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    csrf = body.csrf;
  } else {
    const form = await req.formData();
    csrf = String(form.get('csrf') || '');
  }

  if (!validateCsrf(session, csrf)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  const clerkUserId = params.id;
  let clerkResult: any = null;
  try {
    clerkResult = await clerkClient.users.deleteUser(clerkUserId);
  } catch (e: any) {
    clerkResult = { error: String(e?.message || e) };
  }

  const local = await prisma.user.upsert({
    where: { clerkUserId },
    update: { status: 'DELETED', deletedAt: new Date() },
    create: { clerkUserId, username: clerkUserId, status: 'DELETED', deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actor: 'ADMIN',
      action: 'DELETE',
      targetUserId: local.id,
      metadata: clerkResult ? (clerkResult as any) : undefined,
    },
  });

  return NextResponse.json({ ok: true, clerk: clerkResult });
}
