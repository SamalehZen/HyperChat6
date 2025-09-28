export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/_lib/auth';
import { z } from 'zod';
import { upsertUIPreferences } from '@/app/api/_lib/ui-preferences';
import { ChatMode } from '@repo/shared/config';
import { setLatestPreferencesEvent } from '@/app/api/_lib/preferences-events';
import { prisma } from '@repo/prisma';
import { ActivityAction } from '@prisma/client';
import { geolocation } from '@vercel/functions';
import { getIp } from '@/app/api/completion/utils';
import { publishUIPreferences } from '@/app/api/_lib/realtime-preferences';

const schema = z.object({
  backgroundVariant: z.enum(['new','old','mesh','shader','neural','redlines','shaderlines']).optional(),
  aiPromptShinePreset: z.string().optional(),
  allowedChatModes: z.array(z.nativeEnum(ChatMode)).optional(),
});

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  const json = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const saved = await upsertUIPreferences(parsed.data as any);
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
  const evt = { backgroundVariant: saved.backgroundVariant, aiPromptShinePreset: saved.aiPromptShinePreset, allowedChatModes: saved.allowedChatModes, updatedAt: saved.updatedAt! } as any;  setLatestPreferencesEvent(evt);
  // Publish cross-instances (best-effort)
  await publishUIPreferences(evt);
  return NextResponse.json(saved);
}
