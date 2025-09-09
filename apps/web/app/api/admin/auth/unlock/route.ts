import { NextRequest, NextResponse } from 'next/server';
import { adminUnlock } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = body.token || req.headers.get('x-admin-unlock') || req.nextUrl.searchParams.get('token');
  const ok = await adminUnlock(String(token || ''));
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true });
}
