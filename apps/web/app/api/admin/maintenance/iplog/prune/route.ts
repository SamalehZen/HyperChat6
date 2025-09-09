import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { readAdminSessionFromRequest, validateCsrf } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await readAdminSessionFromRequest(req);
  const contentType = req.headers.get('content-type') || '';
  let csrf: string | undefined;
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    csrf = body.csrf;
  } else {
    const form = await req.formData();
    csrf = String(form.get('csrf') || '');
  }
  if (!session || !validateCsrf(session, csrf)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.ipLog.deleteMany({ where: { createdAt: { lt: threshold } } });

  await prisma.auditLog.create({
    data: {
      actor: 'SYSTEM',
      action: 'UPDATE_STATUS',
      metadata: { prune: 'iplog', deletedCount: result.count } as any,
    },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
