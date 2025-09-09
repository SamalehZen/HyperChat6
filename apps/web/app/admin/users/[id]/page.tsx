import { prisma } from '@repo/prisma';
import { readAdminSessionFromCookies } from '@/lib/admin-auth';
import { getRemainingCredits } from '@/app/api/completion/credit-service';
import Link from 'next/link';

export const runtime = 'nodejs';

export default async function AdminUserDetail({ params }: { params: { id: string } }) {
  const session = await readAdminSessionFromCookies();
  if (!session) return null;
  const clerkUserId = params.id;

  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  const remaining = await getRemainingCredits({ userId: clerkUserId });
  const ipLogs = await prisma.ipLog.findMany({
    where: { userId: user?.id || '' },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">User: {user?.username || clerkUserId}</h2>
        <Link className="text-sm text-blue-600 hover:underline" href="/admin/users">Back to list</Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="border rounded p-4">
          <div className="font-medium mb-2">Info</div>
          <div className="text-sm space-y-1">
            <div>Status: <span className="font-mono">{user?.status || 'ACTIVE'}</span></div>
            <div>Last seen: {user?.lastSeen ? new Date(user.lastSeen).toLocaleString() : '-'}</div>
            <div>Remaining credits: {remaining}</div>
          </div>
        </div>

        <div className="border rounded p-4">
          <div className="font-medium mb-2">Add daily points</div>
          <form action={`/api/admin/users/${encodeURIComponent(clerkUserId)}/credits/add`} method="POST" className="flex items-end gap-2">
            <input type="hidden" name="csrf" value={session.csrf} />
            <div className="flex-1">
              <label className="block text-sm">Amount</label>
              <input name="amount" type="number" className="mt-1 w-full rounded border px-3 py-2" placeholder="10" required />
            </div>
            <button className="rounded bg-black text-white px-4 py-2" type="submit">Add</button>
          </form>
        </div>

        <div className="border rounded p-4">
          <div className="font-medium mb-2">Status</div>
          <div className="flex gap-2">
            {['ACTIVE','PAUSED','BLOCKED'].map(s => (
              <form key={s} action={`/api/admin/users/${encodeURIComponent(clerkUserId)}/status`} method="POST">
                <input type="hidden" name="csrf" value={session.csrf} />
                <input type="hidden" name="status" value={s} />
                <button className="rounded border px-3 py-2 hover:bg-gray-50" type="submit">{s}</button>
              </form>
            ))}
          </div>
          <form action={`/api/admin/users/${encodeURIComponent(clerkUserId)}/delete`} method="POST" className="mt-4">
            <input type="hidden" name="csrf" value={session.csrf} />
            <button className="rounded border border-red-200 text-red-700 px-3 py-2 hover:bg-red-50" type="submit">Delete user</button>
          </form>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded p-4">
          <div className="font-medium mb-2">Reset local password</div>
          <form action={`/api/admin/users/${encodeURIComponent(clerkUserId)}/reset-password`} method="POST" className="flex items-end gap-2">
            <input type="hidden" name="csrf" value={session.csrf} />
            <div className="flex-1">
              <label className="block text-sm">New password</label>
              <input name="password" type="password" className="mt-1 w-full rounded border px-3 py-2" placeholder="********" required minLength={8} />
            </div>
            <button className="rounded bg-black text-white px-4 py-2" type="submit">Reset</button>
          </form>
        </div>

        <div className="border rounded p-4">
          <div className="font-medium mb-2">Last IPs</div>
          <ul className="text-sm space-y-1">
            {ipLogs.map(log => (
              <li key={log.id} className="flex justify-between">
                <span>{log.ip}</span>
                <span className="text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
              </li>
            ))}
            {!ipLogs.length && <li className="text-gray-500">No IP logs</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
