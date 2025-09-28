export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { getUIPreferences } from '@/app/api/_lib/ui-preferences';
import { getPreferencesEmitter, getLatestPreferencesEvent } from '@/app/api/_lib/preferences-events';
import { startPreferencesWatcher } from '@/app/api/_lib/realtime-preferences';
import { getAccessEmitter } from '@/app/api/_lib/access-events';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;

export async function GET(request: NextRequest) {
  startPreferencesWatcher();
  const { readable, writable } = new TransformStream();
  const encoder = new TextEncoder();
  const writer = writable.getWriter();
  const emit = (data: any) => writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  const emitEvent = (event: string, data: any) => writer.write(encoder.encode(`event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`));

  const initial = getLatestPreferencesEvent() || (await getUIPreferences());
  await emit(initial);

  const emitter = getPreferencesEmitter();
  const onUpdate = (data: any) => emit(data);
  emitter.on('update', onUpdate);

  const accessEmitter = getAccessEmitter();
  const onUserAccessChanged = (payload: any) => emitEvent('user-access-changed', payload);
  accessEmitter.on('user-access-changed', onUserAccessChanged);

  const keepAlive = setInterval(() => {
    writer.write(encoder.encode(`: ping\n\n`));
  }, 25000);

  request.signal.addEventListener('abort', () => {
    clearInterval(keepAlive);
    emitter.off('update', onUpdate);
    accessEmitter.off('user-access-changed', onUserAccessChanged);
    try { writer.close(); } catch {}
  });

  return new NextResponse(readable as any, { headers: SSE_HEADERS });
}
