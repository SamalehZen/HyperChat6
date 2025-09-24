import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export default function middleware(req: NextRequest) {
  const url = new URL(req.url);
  if (url.pathname.startsWith('/admin')) {
    const hasSession = !!req.cookies.get('session')?.value;
    if (!hasSession) {
      url.pathname = '/sign-in';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
