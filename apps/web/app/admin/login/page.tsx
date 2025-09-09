'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Login failed');
        setLoading(false);
        return;
      }
      router.push('/admin/users');
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow w-full max-w-sm border">
        <h1 className="text-xl font-semibold mb-4">Admin Login</h1>
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        <label className="block text-sm font-medium">Username</label>
        <input className="mt-1 mb-3 w-full rounded border px-3 py-2" value={username} onChange={e=>setUsername(e.target.value)} required />
        <label className="block text-sm font-medium">Password</label>
        <input type="password" className="mt-1 mb-4 w-full rounded border px-3 py-2" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button disabled={loading} className="w-full rounded bg-black text-white py-2 disabled:opacity-50" type="submit">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
