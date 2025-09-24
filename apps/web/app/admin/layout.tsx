import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/libs/auth-server';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/sign-in');
  if (session.role !== 'admin') redirect('/');
  return <>{children}</>;
}
