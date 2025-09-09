import { NextRequest, NextResponse } from 'next/server';
import { clearAdminSessionCookie } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  clearAdminSessionCookie(res);
  return res;
}

export async function GET(_req: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  clearAdminSessionCookie(res);
  return res;
}
