import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/libs/auth-server';
import { AdminLayoutWrapper } from './_components/admin-layout-wrapper';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  const isAuthenticated = !!session;
  const isAdmin = session?.role === 'admin';
  
  if (!isAuthenticated) redirect('/sign-in');
  if (!isAdmin) redirect('/');
  
  return (
    <AdminLayoutWrapper isAuthenticated={isAuthenticated} isAdmin={isAdmin}>
      {children}
    </AdminLayoutWrapper>
  );
}
