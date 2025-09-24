import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/_lib/auth';
import { z } from 'zod';
import { upsertUIPreferences } from '@/app/api/_lib/ui-preferences';
import { setLatestPreferencesEvent } from '@/app/api/_lib/preferences-events';
import { prisma } from '@repo/prisma';
import { ActivityAction } from '@prisma/client';
import { geolocation } from '@vercel/functions';
import { getIp } from '@/app/api/completion/utils';

const schema = z.object({
  backgroundVariant: z.enum(['new','old','mesh','shader','neural','redlines','shaderlines']),
  aiPromptShinePreset: z.string(),
});

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  const json = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const saved = await upsertUIPreferences(parsed.data);
  const gl = geolocation(request);
  const ip = getIp(request);
  try {
    await prisma.activityLog.create({
      data: {
        userId: undefined,
        actorId: admin.userId,
        action: ActivityAction.account_updated,
        details: { uiPreferences: parsed.data },
        ip: ip ?? undefined,
        country: gl?.country ?? undefined,
        region: gl?.region ?? undefined,
        city: gl?.city ?? undefined,
      },
    });
  } catch {}
  setLatestPreferencesEvent({ backgroundVariant: saved.backgroundVariant, aiPromptShinePreset: saved.aiPromptShinePreset, updatedAt: saved.updatedAt! });
  return NextResponse.json(saved);
}
