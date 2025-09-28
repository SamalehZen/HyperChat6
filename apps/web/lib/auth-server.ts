import { cookies } from 'next/headers';
// Defer prisma import to runtime to avoid import-time crashes when env/DB are missing
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
let _prisma: any;

export type ServerSession = {
  userId: string;
  role: 'admin' | 'user';
  isSuspended: boolean;
};

export async function getServerSession(): Promise<ServerSession | null> {
  try {
    const token = cookies().get('session')?.value;
    if (!token) return null;
    if (!_prisma) {
      const mod = await import('@repo/prisma');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      _prisma = mod.prisma;
    }
    const session = await _prisma.session.findUnique({ where: { token }, include: { user: true } });
    if (!session || !session.user) return null;
    if (session.expiresAt < new Date()) return null;
    if ((session.user as any).deletedAt) return null;
    if ((session.user as any).isLocked) return null;
    return {
      userId: session.userId,
      role: session.user.role as 'admin' | 'user',
      isSuspended: session.user.isSuspended,
    };
  } catch {
    return null;
  }
}
