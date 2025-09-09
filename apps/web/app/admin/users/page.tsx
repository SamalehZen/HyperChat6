import { prisma } from '@repo/prisma';
import { getRemainingCredits } from '@/app/api/completion/credit-service';
import Link from 'next/link';
import { isOnline } from '@/lib/user-status';

export const runtime = 'nodejs';

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const withExtras = await Promise.all(users.map(async u => {
    const lastIp = await prisma.ipLog.findFirst({ where: { userId: u.id }, orderBy: { createdAt: 'desc' } });
    const remaining = await getRemainingCredits({ userId: u.clerkUserId });
    return {
      ...u,
      lastIp: lastIp?.ip || '-'
      , remaining,
      online: isOnline(u.lastSeen ?? null),
    };
  }));

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Users</h2>
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last IP</th>
              <th className="px-3 py-2">Points</th>
              <th className="px-3 py-2">Conn.</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {withExtras.map(u => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.username}</td>
                <td className="px-3 py-2">{u.status}</td>
                <td className="px-3 py-2">{u.lastIp}</td>
                <td className="px-3 py-2">{u.remaining}</td>
                <td className="px-3 py-2">{u.online ? 'connecté' : 'déconnecté'}</td>
                <td className="px-3 py-2 text-right"><Link className="text-blue-600 hover:underline" href={`/admin/users/${u.clerkUserId}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
