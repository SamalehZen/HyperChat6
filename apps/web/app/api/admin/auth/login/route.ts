import { NextRequest, NextResponse } from 'next/server';
import { adminLogin, setAdminSessionCookie } from '@/lib/admin-auth';
import { getIp } from '@/app/api/completion/utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let username = '';
  let password = '';
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    username = body.username || '';
    password = body.password || '';
  } else {
    const form = await req.formData();
    username = String(form.get('username') || '');
    password = String(form.get('password') || '');
  }

  const ip = getIp(req);
  const result = await adminLogin({ username, password, ip });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, locked: result.locked ?? false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true }, { status: 200 });
  setAdminSessionCookie(res, result.token);
  return res;
}
