import { cookies } from 'next/headers';
import { prisma } from '@repo/prisma';

export type ServerSession = {
  userId: string;
  role: 'admin' | 'user';
  isSuspended: boolean;
};

export async function getServerSession(): Promise<ServerSession | null> {
  const token = cookies().get('session')?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || !session.user) return null;
  if (session.expiresAt < new Date()) return null;
  return {
    userId: session.userId,
    role: session.user.role as 'admin' | 'user',
    isSuspended: session.user.isSuspended,
  };
}
