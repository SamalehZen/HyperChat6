"use client";
import { useEffect, useRef } from 'react';
import Pusher, { Channel } from 'pusher-js';
import { useAllowedChatModesStore, useChatStore } from '@repo/common/store';
import { useAuth } from './auth';
import { ChatMode } from '@repo/shared/config';
import { useToast } from '@repo/ui';

async function fetchAllowed() {
  try {
    const res = await fetch(`/api/user/chat-modes?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json as { allowedChatModes: string[] | null };
  } catch {
    return null;
  }
}

export function AllowedChatModesProvider() {
  const setAllowed = useAllowedChatModesStore(s => s.setAllowedChatModes);
  const isModeAllowed = useAllowedChatModesStore(s => s.isModeAllowed);
  const chatMode = useChatStore(s => s.chatMode);
  const setChatMode = useChatStore(s => s.setChatMode);
  const { userId } = useAuth();
  const { toast } = useToast();
  const esRef = useRef<EventSource | null>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const data = await fetchAllowed();
      if (data && !cancelled) {
        setAllowed(data.allowedChatModes);
        if (data.allowedChatModes && !data.allowedChatModes.includes(chatMode)) {
          setChatMode(ChatMode.GEMINI_2_5_FLASH);
          toast({ title: 'Ce mode n\u2019est plus autorisé par votre administrateur' });
        }
      }
      const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
      const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
      if (key && cluster) {
        const p = new Pusher(key, { cluster, forceTLS: true, enabledTransports: ['ws', 'wss'] });
        pusherRef.current = p;
        const ch = p.subscribe('ui-preferences');
        channelRef.current = ch;
        ch.bind('user-access-changed', async (payload: any) => {
          try {
            if (payload?.userId && payload.userId === userId) {
              const upd = await fetchAllowed();
              if (upd && !cancelled) {
                setAllowed(upd.allowedChatModes);
                if (upd.allowedChatModes && !upd.allowedChatModes.includes(chatMode)) {
                  setChatMode(ChatMode.GEMINI_2_5_FLASH);
                  toast({ title: 'Ce mode n\u2019est plus autorisé par votre administrateur' });
                }
              }
            }
          } catch {}
        });
      } else {
        try {
          const es = new EventSource('/api/ui/stream');
          esRef.current = es;
          const onAccess = async (evt: MessageEvent) => {
            try {
              const payload = JSON.parse(evt.data);
              if (payload?.userId && payload.userId === userId) {
                const upd = await fetchAllowed();
                if (upd && !cancelled) {
                  setAllowed(upd.allowedChatModes);
                  if (upd.allowedChatModes && !upd.allowedChatModes.includes(chatMode)) {
                    setChatMode(ChatMode.GEMINI_2_5_FLASH);
                    toast({ title: 'Ce mode n\u2019est plus autorisé par votre administrateur' });
                  }
                }
              }
            } catch {}
          };
          (es as any).addEventListener?.('user-access-changed', onAccess);
          es.onerror = () => {
            try { es.close(); } catch {}
            esRef.current = null;
          };
        } catch {}
      }
    };
    init();
    return () => {
      cancelled = true;
      if (channelRef.current) {
        try { channelRef.current.unbind('user-access-changed'); } catch {}
        channelRef.current = null;
      }
      if (pusherRef.current) {
        try { pusherRef.current.unsubscribe('ui-preferences'); } catch {}
        try { pusherRef.current.disconnect(); } catch {}
        pusherRef.current = null;
      }
      if (esRef.current) {
        try { esRef.current.close(); } catch {}
        esRef.current = null;
      }
    };
  }, [setAllowed, userId]);

  return null;
}