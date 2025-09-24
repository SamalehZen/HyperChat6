"use client";
import { useEffect, useRef } from 'react';
import { useGlobalPreferencesStore } from '@repo/common/store';

async function fetchPreferences() {
  try {
    const res = await fetch('/api/ui/preferences', { cache: 'no-store' });
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

  useEffect(() => {
    let stopped = false;
    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(async () => {
        const prefs = await fetchPreferences();
        if (prefs) setFromServer(prefs as any);
      }, 15000);
      document.addEventListener('visibilitychange', onVisibility);
    };
    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
    const onVisibility = async () => {
      if (document.visibilityState === 'visible') {
        const prefs = await fetchPreferences();
        if (prefs) setFromServer(prefs as any);
      }
    };

    const init = async () => {
      const prefs = await fetchPreferences();
      if (prefs) setFromServer(prefs as any);
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
          stopPolling();
        };
      } catch {
        startPolling();
      }
    };
    init();
    return () => {
      stopped = true;
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      stopPolling();
    };
  }, [setFromServer]);

  return null;
}
