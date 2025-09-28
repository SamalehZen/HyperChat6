import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateHeartbeat } from '@/app/api/_lib/auth';

async function buildStatusResponse(request: NextRequest, doPing: boolean) {
  const token = request.cookies.get('session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ reason: 'account_deleted' }, { status: 410 });
  }

  if (doPing) {
    try { await updateHeartbeat(request, session.token); } catch {}
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      role: session.role,
      isSuspended: session.isSuspended,
    },
  });
}

export async function GET(request: NextRequest) {
  return buildStatusResponse(request, false);
}

export async function POST(request: NextRequest) {
  return buildStatusResponse(request, true);
}
