import { prisma } from '@repo/prisma';

export const runtime = 'nodejs';

export default async function AuditPage({ searchParams }: { searchParams?: { action?: string; userId?: string; page?: string } }) {
  const action = searchParams?.action;
  const userId = searchParams?.userId;
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1);
  const take = 50;
  const skip = (page - 1) * take;

  const logs = await prisma.auditLog.findMany({
    where: {
      action: action ? (action as any) : undefined,
      targetUserId: userId || undefined,
    },
    include: { targetUser: true },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Audit Logs</h2>
      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="border-t">
                <td className="px-3 py-2">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{l.actor}</td>
                <td className="px-3 py-2">{l.action}</td>
                <td className="px-3 py-2">{l.targetUser?.username || l.targetUserId || '-'}</td>
                <td className="px-3 py-2 max-w-[28rem] truncate">{l.metadata ? JSON.stringify(l.metadata) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
