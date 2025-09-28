'use client';

import { useEffect, useState } from 'react';
import { Button, Skeleton } from '@repo/ui';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL ?? '';

export default function CORSTestPage() {
  const [status, setStatus] = useState<'idle'|'loading'|'ok'|'error'>('idle');
  const [detail, setDetail] = useState<string>('');

  const run = async () => {
    setStatus('loading'); setDetail('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/metrics`, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const json = await res.json();
      setDetail(JSON.stringify({ sample: json?.onlineCount ?? json }, null, 2));
      setStatus('ok');
    } catch (e: any) {
      setDetail(e?.message || String(e));
      setStatus('error');
    }
  };

  useEffect(() => { run(); }, []);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">Test CORS/CSRF — API admin</h1>
      <p className="mb-4 text-sm text-muted-foreground">Vérifie l’appel à /api/admin/metrics avec credentials: 'include'.</p>
      <div className="mb-3">
        <Button onClick={run} disabled={status === 'loading'}>Relancer le test</Button>
      </div>
      {status === 'loading' ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="rounded-md border p-3 text-sm">
          <div className="mb-1 font-medium">Statut: {status.toUpperCase()}</div>
          <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{detail || '—'}</pre>
        </div>
      )}
    </div>
  );
}
