import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/api/_lib/auth';
import { prisma } from '@repo/prisma';

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });

  return NextResponse.json({
    user: {
      id: session.userId,
      email: user?.email ?? undefined,
      role: session.role,
      isSuspended: session.isSuspended,
    },
  });
}
