import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { readAdminSessionFromRequest, validateCsrf } from '@/lib/admin-auth';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await readAdminSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = req.headers.get('content-type') || '';
  let password = '';
  let csrf: string | undefined;
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    password = String(body.password || '');
    csrf = body.csrf;
  } else {
    const form = await req.formData();
    password = String(form.get('password') || '');
    csrf = String(form.get('csrf') || '');
  }

  if (!validateCsrf(session, csrf)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password too short' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  const clerkUserId = params.id;
  const local = await prisma.user.upsert({
    where: { clerkUserId },
    update: { localPasswordHash: hash },
    create: { clerkUserId, username: clerkUserId, status: 'ACTIVE', localPasswordHash: hash },
  });

  await prisma.auditLog.create({
    data: {
      actor: 'ADMIN',
      action: 'RESET_PASSWORD',
      targetUserId: local.id,
    },
  });

  return NextResponse.json({ ok: true });
}
