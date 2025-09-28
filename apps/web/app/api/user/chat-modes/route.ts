import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/_lib/auth';
import { prisma } from '@repo/prisma';

export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ reason: 'account_deleted' }, { status: 410 });
  const allowed = (user as any).allowedChatModes ?? null;
  return NextResponse.json({ allowedChatModes: allowed });
}