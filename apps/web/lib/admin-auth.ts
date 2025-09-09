import { cookies as nextCookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import { prisma } from '@repo/prisma';

const ADMIN_COOKIE_NAME = 'admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getJwtSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set');
  return new TextEncoder().encode(secret);
}

function isProd() {
  return process.env.NODE_ENV === 'production';
}

function getMaxAttempts() {
  const v = process.env.ADMIN_LOGIN_MAX_ATTEMPTS || '3';
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

function randomToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

export type AdminSession = {
  username: string;
  csrf: string;
  iat: number;
  exp: number;
};

export async function createAdminSession(username: string): Promise<string> {
  const payload: Omit<AdminSession, 'iat' | 'exp'> = {
    username,
    csrf: randomToken(),
  };

  const now = Math.floor(Date.now() / 1000);
  const exp = now + COOKIE_MAX_AGE;

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(getJwtSecret());

  return token;
}

export async function readAdminSessionFromRequest(req: NextRequest): Promise<AdminSession | null> {
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    const { payload } = await jwtVerify(cookie, getJwtSecret());
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

export async function readAdminSessionFromCookies(): Promise<AdminSession | null> {
  const cookie = nextCookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    const { payload } = await jwtVerify(cookie, getJwtSecret());
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

export function setAdminSessionCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export function clearAdminSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    maxAge: 0,
    path: '/',
  });
}

async function isLocked(): Promise<boolean> {
  return (await kv.get<boolean>('admin:locked')) === true;
}

async function setLocked(locked: boolean): Promise<void> {
  await kv.set('admin:locked', locked);
}

async function getAttempts(): Promise<number> {
  const v = await kv.get<number>('admin:attempts');
  return typeof v === 'number' ? v : 0;
}

async function resetAttempts(): Promise<void> {
  await kv.set('admin:attempts', 0);
}

async function incAttempts(): Promise<number> {
  const n = ((await getAttempts()) || 0) + 1;
  await kv.set('admin:attempts', n);
  return n;
}

async function rateLimitLogin(ip: string | null): Promise<boolean> {
  if (!ip) return false; // cannot rate limit without IP
  try {
    const key = `admin:login:rl:${ip}`;
    const count = await kv.incr(key);
    if (count === 1) {
      await kv.expire(key, 60);
    }
    // Basic limit: 10 per minute
    return count > 10;
  } catch {
    return false;
  }
}

export async function adminLogin({ username, password, ip }: { username: string; password: string; ip: string | null; }): Promise<{ ok: true; token: string } | { ok: false; error: string; locked?: boolean }> {
  if (await rateLimitLogin(ip)) {
    return { ok: false, error: 'Too many attempts. Try again later.' };
  }

  if (await isLocked()) {
    return { ok: false, error: 'Account locked. Contact administrator.', locked: true };
  }

  const envUser = process.env.ADMIN_USERNAME || '';
  const hash = process.env.ADMIN_PASSWORD_HASH || '';

  if (!envUser || !hash) {
    return { ok: false, error: 'Admin credentials not configured.' };
  }

  const usernameOk = username === envUser;
  const passwordOk = await bcrypt.compare(password, hash);

  if (!usernameOk || !passwordOk) {
    const attempts = await incAttempts();
    if (attempts >= getMaxAttempts()) {
      await setLocked(true);
    }
    return {
      ok: false,
      error: 'Invalid credentials',
      locked: await isLocked(),
    };
  }

  await resetAttempts();
  const token = await createAdminSession(envUser);
  return { ok: true, token };
}

export async function adminUnlock(token: string): Promise<boolean> {
  if (!token || token !== process.env.ADMIN_UNLOCK_TOKEN) return false;
  await resetAttempts();
  await setLocked(false);
  await prisma.auditLog.create({
    data: {
      actor: 'SYSTEM',
      action: 'UPDATE_STATUS',
      metadata: {
        admin_unlock: true,
      } as any,
    },
  });
  return true;
}

export async function requireAdmin(req: NextRequest): Promise<AdminSession | null> {
  const session = await readAdminSessionFromRequest(req);
  if (!session) return null;
  return session;
}

export function validateCsrf(session: AdminSession | null, token: string | undefined): boolean {
  if (!session) return false;
  if (!token) return false;
  return session.csrf === token;
}

export { ADMIN_COOKIE_NAME };