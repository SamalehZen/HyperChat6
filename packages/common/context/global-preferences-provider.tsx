"use client";
import { useEffect, useRef } from 'react';
import PusherJS from 'pusher-js';
import { useGlobalPreferencesStore } from '@repo/common/store';

async function fetchPreferences() {
  try {
    const res = await fetch(`/api/ui/preferences?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json as { backgroundVariant: string; aiPromptShinePreset: string; updatedAt?: string };
  } catch {
    return null;
  }
}

export function GlobalPreferencesProvider() {
  const setFromServer = useGlobalPreferencesStore(s => s.setFromServer);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const pusherRef = useRef<PusherJS | null>(null);
  const channelRef = useRef<PusherJS.Channel | null>(null);

  useEffect(() => {
    let stopped = false;
    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(async () => {
        const prefs = await fetchPreferences();
        if (prefs) setFromServer(prefs as any);
      }, 1000);
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('focus', onFocus);
    };
    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
    const onVisibility = async () => {
      if (document.visibilityState === 'visible') {
        const prefs = await fetchPreferences();
        if (prefs) setFromServer(prefs as any);
      }
    };
    const onFocus = async () => {
      const prefs = await fetchPreferences();
      if (prefs) setFromServer(prefs as any);
    };

    const init = async () => {
      const prefs = await fetchPreferences();
      if (prefs) setFromServer(prefs as any);
      const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
      const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
      if (key && cluster) {
        const p = new PusherJS(key, { cluster, forceTLS: true, enabledTransports: ['ws', 'wss'] });
        pusherRef.current = p;
        const ch = p.subscribe('ui-preferences');
        channelRef.current = ch;
        ch.bind('update', (data: any) => {
          try { setFromServer(data); } catch {}
        });
        // still start polling as a safety net
        startPolling();
      } else {
        try {
          const es = new EventSource('/api/ui/stream');
          esRef.current = es;
          es.onmessage = (evt) => {
            try {
              const data = JSON.parse(evt.data);
              setFromServer(data);
            } catch {}
          };
          es.onerror = () => {
            es.close();
            esRef.current = null;
            startPolling();
          };
          es.onopen = () => {
            startPolling();
          };
        } catch {
          startPolling();
        }
      }
    };
    init();
    return () => {
      stopped = true;
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (channelRef.current) {
        try { channelRef.current.unbind_all(); } catch {}
        try { channelRef.current.unsubscribe?.(); } catch {}
        channelRef.current = null;
      }
      if (pusherRef.current) {
        try { pusherRef.current.disconnect(); } catch {}
        pusherRef.current = null;
      }
      stopPolling();
    };
  }, [setFromServer]);

  return null;
}
