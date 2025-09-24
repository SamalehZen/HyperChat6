import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@repo/prisma';

export const runtime = 'nodejs';

export default async function middleware(req: NextRequest) {
  const url = new URL(req.url);

  // Allow public routes and assets
  const pathname = url.pathname;
  if (
    pathname.startsWith('/api/auth') ||
    pathname === '/sign-in' ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.json'
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('session')?.value;
  if (!token) {
    url.pathname = '/sign-in';
    url.search = '';
    return NextResponse.redirect(url);
  }

  try {
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
    const valid = !!session && session.expiresAt > new Date() && !!session.user;
    if (!valid) {
      const res = NextResponse.redirect(new URL('/sign-in', req.url));
      const isProd = process.env.NODE_ENV === 'production';
      res.cookies.set('session', '', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 });
      return res;
    }
    // If user is suspended, we still allow navigation so the gate can block interactions.
  } catch {
    // On DB errors, fail-closed and redirect
    const res = NextResponse.redirect(new URL('/sign-in', req.url));
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|sign-in|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
  ],
};
