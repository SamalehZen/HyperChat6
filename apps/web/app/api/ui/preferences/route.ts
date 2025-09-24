export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { getUIPreferences } from '@/app/api/_lib/ui-preferences';

export async function GET() {
  const prefs = await getUIPreferences();
  return NextResponse.json(prefs, { headers: { 'Cache-Control': 'no-store, max-age=0', 'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store' } });
}
