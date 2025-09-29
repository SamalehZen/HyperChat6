import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@repo/prisma';
import crypto from 'crypto';
import { geolocation } from '@vercel/functions';

const SESSION_COOKIE_NAME = 'session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type SessionInfo = {
  userId: string;
  role: 'admin' | 'user';
  isSuspended: boolean;
  sessionId: string;
  token: string;
};

export async function getSession(request: NextRequest): Promise<SessionInfo | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const existing = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!existing) return null;
  if (existing.expiresAt < new Date()) return null;
  if (!existing.user) return null;
  if ((existing.user as any).deletedAt) return null;
  if ((existing.user as any).isLocked) return null;

  return {
    userId: existing.user.id,
    role: existing.user.role as 'admin' | 'user',
    isSuspended: existing.user.isSuspended,
    sessionId: existing.id,
    token: existing.token,
  };
}

export async function requireAuth(request: NextRequest): Promise<SessionInfo> {
  const session = await getSession(request);
  if (!session) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  try {
    await updateHeartbeat(request, session.token);
  } catch {}
  return session;
}

export async function requireAdmin(request: NextRequest): Promise<SessionInfo> {
  const session = await requireAuth(request);
  if (session.role !== 'admin') throw new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  return session;
}

export async function createSessionForUser(userId: string, request: NextRequest) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const gl = geolocation(request);
  const ip = getIp(request);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === 'user') {
    await prisma.session.deleteMany({ where: { userId } });
  }

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
      lastSeen: now,
      lastIp: ip ?? undefined,
      lastCountry: gl?.country ?? undefined,
      lastRegion: gl?.region ?? undefined,
      lastCity: gl?.city ?? undefined,
    },
  });

  setSessionCookie(token, expiresAt);
  return { token, expiresAt };
}

export function setSessionCookie(token: string, expiresAt: Date) {
  const isProd = process.env.NODE_ENV === 'production';
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie() {
  const isProd = process.env.NODE_ENV === 'production';
  cookies().set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function updateHeartbeat(request: NextRequest, token: string) {
  const gl = geolocation(request);
  const ip = getIp(request);
  await prisma.session.update({
    where: { token },
    data: {
      lastSeen: new Date(),
      lastIp: ip ?? undefined,
      lastCountry: gl?.country ?? undefined,
      lastRegion: gl?.region ?? undefined,
      lastCity: gl?.city ?? undefined,
    },
  });
}

export function getIp(request: NextRequest) {
  const ipHeader =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-vercel-forwarded-for');
  if (!ipHeader) return undefined;
  return ipHeader.split(',')[0].trim();
}
