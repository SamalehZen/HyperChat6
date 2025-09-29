'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@repo/ui';

export type User = { id: string; email?: string; role: 'admin' | 'user'; isSuspended?: boolean };

type AuthState = {
  user?: User;
  isSignedIn: boolean;
  userId?: string;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | undefined>(undefined);
  const isSignedIn = !!user?.id;
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) {
          try {
            const data = await res.json();
            if (data?.reason === 'session_revoked') {
              toast({ title: 'Vous avez été déconnecté', description: 'Votre compte a été ouvert sur un autre appareil.' });
              try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
            }
          } catch {}
          if (!cancelled) setUser(undefined);
          return;
        }
        const data = await res.json();
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) setUser(undefined);
      }
    };
    load();

    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [toast]);

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(undefined);
  };

  return (
    <AuthContext.Provider value={{ user, isSignedIn, userId: user?.id, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  const { isSignedIn, user } = ctx;
  return { isSignedIn, userId: user?.id };
}

export function useUser() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useUser must be used within AuthProvider');
  const { user } = ctx;
  return { user };
}
