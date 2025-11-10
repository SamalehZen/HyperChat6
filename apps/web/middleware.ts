import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const SITE_PAUSED = true;

export default function middleware(req: NextRequest) {
  const url = new URL(req.url);

  // Allow public routes and assets (and SSE streaming route)
  const pathname = url.pathname;
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/completion') ||
    pathname === '/sign-in' ||
    pathname === '/maintenance' ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.json'
  ) {
    return NextResponse.next();
  }

  // If site is paused, redirect to maintenance
  if (SITE_PAUSED) {
    url.pathname = '/maintenance';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Require session cookie for everything else
  const hasSession = !!req.cookies.get('session')?.value;
  if (!hasSession) {
    url.pathname = '/sign-in';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|api/completion|sign-in|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
  ],
};
