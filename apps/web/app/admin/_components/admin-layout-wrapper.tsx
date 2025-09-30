'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@repo/common/components/layout/admin-sidebar';

export function AdminLayoutWrapper({ 
  children,
  isAuthenticated,
  isAdmin 
}: { 
  children: ReactNode;
  isAuthenticated: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/sign-in');
    } else if (!isAdmin) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, router]);

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AdminSidebar />
      <main className="admin-background flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}