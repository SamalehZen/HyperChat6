import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import { requireAdmin } from '@/app/api/_lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const order = (searchParams.get('order') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';
  const skip = (page - 1) * limit;

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [total, items] = await Promise.all([
    prisma.activityLog.count({ where: { userId: params.id, createdAt: { gte: since } } }),
    prisma.activityLog.findMany({
      where: { userId: params.id, createdAt: { gte: since } },
      orderBy: { createdAt: order },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({ page, limit, total, order, items });
}
