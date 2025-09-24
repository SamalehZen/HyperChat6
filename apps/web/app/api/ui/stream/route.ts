import { NextRequest, NextResponse } from 'next/server';
import { getUIPreferences } from '@/app/api/_lib/ui-preferences';
import { getPreferencesEmitter, getLatestPreferencesEvent } from '@/app/api/_lib/preferences-events';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;

export async function GET(request: NextRequest) {
  const { readable, writable } = new TransformStream();
  const encoder = new TextEncoder();
  const writer = writable.getWriter();
  const emit = (data: any) => writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

  const initial = getLatestPreferencesEvent() || (await getUIPreferences());
  await emit(initial);

  const emitter = getPreferencesEmitter();
  const onUpdate = (data: any) => emit(data);
  emitter.on('update', onUpdate);

  const keepAlive = setInterval(() => {
    writer.write(encoder.encode(`: ping\n\n`));
  }, 25000);

  request.signal.addEventListener('abort', () => {
    clearInterval(keepAlive);
    emitter.off('update', onUpdate);
    try { writer.close(); } catch {}
  });

  return new NextResponse(readable as any, { headers: SSE_HEADERS });
}
