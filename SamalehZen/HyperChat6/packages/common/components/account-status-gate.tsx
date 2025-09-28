"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@repo/ui';
import { useI18n } from '@repo/common/i18n';
import { useAuth } from '@repo/common/context';

export function AccountStatusGate() {
  const { isSignedIn } = useAuth();
  const { t } = useI18n();
  const [status, setStatus] = useState<'ok' | 'suspended' | 'deleted'>('ok');
  const [countdown, setCountdown] = useState<number>(7);
  const intervalRef = useRef<number | null>(null);
  const logoutTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch('/api/auth/heartbeat', { method: 'GET', cache: 'no-store' });
        if (!res) return;
        if (res.status === 200) {
          const data = await res.json();
          const suspended = !!data?.user?.isSuspended;
          if (!cancelled) setStatus(suspended ? 'suspended' : 'ok');
          if (!suspended) {
            // reset any deleted timers if user became active again
            if (logoutTimerRef.current) { window.clearTimeout(logoutTimerRef.current); logoutTimerRef.current = null; }
          }
        } else if (res.status === 410) {
          if (!cancelled) setStatus('deleted');
        } else if (res.status === 401) {
          if (!cancelled) window.location.href = '/sign-in';
        }
      } catch {}
    };

    poll();
    const id = window.setInterval(poll, 2000);
    intervalRef.current = id;
    return () => { cancelled = true; if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [isSignedIn]);

  // Start 7s countdown when deleted
  useEffect(() => {
    if (status !== 'deleted') return;
    setCountdown(7);
    if (logoutTimerRef.current) { window.clearTimeout(logoutTimerRef.current); logoutTimerRef.current = null; }

    const startedAt = Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, 7 - elapsed);
      setCountdown(remaining);
      if (remaining > 0) {
        logoutTimerRef.current = window.setTimeout(tick, 250) as unknown as number;
      } else {
        // Auto-logout then redirect
        fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
          window.location.href = '/sign-in';
        });
      }
    };
    tick();

    return () => { if (logoutTimerRef.current) window.clearTimeout(logoutTimerRef.current); };
  }, [status]);

  const open = status === 'suspended' || status === 'deleted';
  const title = useMemo(() => (
    status === 'suspended' ? t('account.suspended.title') : t('account.deleted.title')
  ), [status, t]);
  const message = useMemo(() => (
    status === 'suspended' ? t('account.suspended.message') : t('account.deleted.message')
  ), [status, t]);
  const countdownText = status === 'deleted' ? t('account.deleted.logoutIn', { seconds: countdown }) : '';

  if (!isSignedIn) return null;

  return (
    <Dialog open={open}>
      <DialogContent
        ariaTitle={title}
        closeButtonClassName="hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-md text-center"
      >
        <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        <DialogDescription className="mt-2 text-base">{message}</DialogDescription>
        {status === 'deleted' && (
          <div className="mt-3 text-sm text-muted-foreground">{countdownText}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
