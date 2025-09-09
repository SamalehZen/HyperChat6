'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogoutPage() {
  const router = useRouter();
  useEffect(() => {
    fetch('/api/admin/auth/logout', { method: 'POST' }).finally(() => router.replace('/admin/login'));
  }, [router]);
  return <div className="min-h-screen grid place-items-center">Logging out…</div>;
}
