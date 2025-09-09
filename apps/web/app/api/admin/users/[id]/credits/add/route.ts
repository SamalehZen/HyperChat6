import { NextRequest, NextResponse } from 'next/server';
import { grantDailyCredits, getRemainingCredits } from '@/app/api/completion/credit-service';
import { prisma } from '@repo/prisma';
import { readAdminSessionFromRequest, validateCsrf } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await readAdminSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = req.headers.get('content-type') || '';
  let amount = 0;
  let csrf: string | undefined;
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    amount = Number(body.amount || 0);
    csrf = body.csrf;
  } else {
    const form = await req.formData();
    amount = Number(form.get('amount') || 0);
    csrf = String(form.get('csrf') || '');
  }

  if (!validateCsrf(session, csrf)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  if (!Number.isFinite(amount) || Math.abs(amount) > 100000) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const clerkUserId = params.id;

  const prev = await getRemainingCredits({ userId: clerkUserId });
  const { previous, next } = await grantDailyCredits(clerkUserId, amount);

  const localUser = await prisma.user.findUnique({ where: { clerkUserId } });

  await prisma.auditLog.create({
    data: {
      actor: 'ADMIN',
      action: 'ADD_POINTS',
      targetUserId: localUser?.id,
      metadata: { amount, previous, next } as any,
    },
  });

  return NextResponse.json({ previous, next });
}
