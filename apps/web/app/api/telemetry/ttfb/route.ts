import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { correlationId, t5, t6, userAgent, rttApprox, deviceHints } = body || {};

    if (!correlationId) {
      return new Response(
        JSON.stringify({ error: 'Missing correlationId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const { prisma } = await import('@repo/prisma');
      await prisma.telemetryTTFB.upsert({
        where: { correlationId },
        create: {
          correlationId,
          mode: 'unknown',
          clientInfo: { t5OffsetMs: t5 ?? null, t6OffsetMs: t6 ?? null, userAgent, rttApprox, deviceHints },
        },
        update: {
          clientInfo: { t5OffsetMs: t5 ?? null, t6OffsetMs: t6 ?? null, userAgent, rttApprox, deviceHints },
        },
      });
    } catch (e) {
      console.warn('Failed to persist TTFB telemetry (server)', e);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON', details: String(error) }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export const runtime = process.env.EDGE_RUNTIME === 'true' ? 'edge' : 'nodejs';