import { NextRequest, NextResponse } from 'next/server';

function getAllowedOrigins(): string[] {
  const raw = process.env.ADMIN_ALLOWED_ORIGINS || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  const origin = request.headers.get('origin') || '';
  const allowed = getAllowedOrigins();
  const isAllowed = allowed.includes(origin);

  if (request.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    if (isAllowed) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Vary', 'Origin');
      res.headers.set('Access-Control-Allow-Credentials', 'true');
      res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', request.headers.get('access-control-request-headers') || 'content-type');
      res.headers.set('Access-Control-Max-Age', '600');
    }
    return res;
  }

  // For state-changing requests, enforce Origin if allowed origins configured
  if (['POST','PATCH','PUT','DELETE'].includes(request.method)) {
    if (allowed.length > 0 && !isAllowed) {
      return NextResponse.json({ error: 'CORS origin not allowed' }, { status: 403 });
    }
  }

  const response = NextResponse.next();
  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
