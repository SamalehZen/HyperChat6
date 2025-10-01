'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className="admin-background flex min-h-full w-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
