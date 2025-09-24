'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Input, Label, cn } from '@repo/ui';

export default function LocalSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Échec de connexion');
        setLoading(false);
        return;
      }
      router.push('/chat');
    } catch (e) {
      setError('Erreur réseau');
      setLoading(false);
    }
  };

  return (
    <div className="bg-secondary/95 fixed inset-0 z-[100] flex h-full w-full flex-col items-center justify-center gap-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="border-hard w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
        <h1 className="mb-4 text-lg font-semibold">Connexion</h1>
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <div className="mb-3">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="mb-4">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'Connexion…' : 'Se connecter'}</Button>
      </form>
    </div>
  );
}
