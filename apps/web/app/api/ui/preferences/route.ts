import { NextResponse } from 'next/server';
import { getUIPreferences } from '@/app/api/_lib/ui-preferences';

export async function GET() {
  const prefs = await getUIPreferences();
  return NextResponse.json(prefs);
}
