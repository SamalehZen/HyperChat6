import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export default function middleware(req: NextRequest) {
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
    '/((?!api/auth|sign-in|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
  ],
};
