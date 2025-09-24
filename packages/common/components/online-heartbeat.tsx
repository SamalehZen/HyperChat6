'use client';

import { useEffect } from 'react';
import { useAuth } from '@repo/common/context/auth';

export function OnlineHeartbeat({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    const ping = async () => {
      try { await fetch('/api/auth/heartbeat', { method: 'POST' }); } catch {}
    };
    ping();
    const id = setInterval(() => { if (!cancelled) ping(); }, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [isSignedIn, intervalMs]);

  return null;
}
