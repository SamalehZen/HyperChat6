import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/api/_lib/auth';
import { prisma } from '@repo/prisma';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ reason: 'session_revoked' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ reason: 'account_deleted' }, { status: 410 });

  return NextResponse.json({
    user: {
      id: session.userId,
      email: user.email,
      role: session.role,
      isSuspended: session.isSuspended,
    },
  });
}
