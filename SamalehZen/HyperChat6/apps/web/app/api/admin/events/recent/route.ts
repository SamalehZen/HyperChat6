import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { requireAdmin } from '@/app/api/_lib/auth';
import { ActivityAction } from '@prisma/client';

function parseWindowMs(param: string | null): number {
  if (!param) return 24 * 60 * 60 * 1000;
  const m = param.trim().toLowerCase();
  if (m.endsWith('h')) return parseInt(m) * 60 * 60 * 1000;
  if (m.endsWith('d')) return parseInt(m) * 24 * 60 * 60 * 1000;
  const n = parseInt(m);
  return isFinite(n) && n > 0 ? n : 24 * 60 * 60 * 1000;
}

const ALLOWED: ActivityAction[] = [
  ActivityAction.login,
  ActivityAction.logout,
  ActivityAction.login_failed as any,
  ActivityAction.lockout as any,
  ActivityAction.unlock as any,
  ActivityAction.suspend,
  ActivityAction.unsuspend,
  ActivityAction.delete,
  ActivityAction.account_created,
  ActivityAction.account_updated,
];

export async function GET(request: NextRequest) {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const windowParam = searchParams.get('window');
  const windowMs = parseWindowMs(windowParam);
  const since = new Date(Date.now() - windowMs);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const typesParam = searchParams.get('types');

  let types: ActivityAction[] | undefined = undefined;
  if (typesParam) {
    const tokens = typesParam.split(',').map(s => s.trim()).filter(Boolean);
    const map = new Map(ALLOWED.map(a => [String(a), a]));
    const arr: ActivityAction[] = [];
    for (const t of tokens) {
      const key = t as keyof typeof ActivityAction;
      const val = (ActivityAction as any)[key] ?? t;
      if (ALLOWED.includes(val)) arr.push(val);
    }
    if (arr.length) types = arr;
  }

  const items = await prisma.activityLog.findMany({
    where: {
      createdAt: { gte: since },
      ...(types ? { action: { in: types } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({ items });
}
