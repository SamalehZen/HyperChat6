import { Redis } from '@upstash/redis';
import { setLatestPreferencesEvent, getLatestPreferencesEvent, getPreferencesEmitter } from './preferences-events';

let started = false as boolean;
let timer: ReturnType<typeof setInterval> | null = null;
let lastVer = 0 as number;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function publishUIPreferences(evt: { backgroundVariant: string; aiPromptShinePreset: string; updatedAt: string }) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set('ui:prefs:latest', evt);
    await redis.incr('ui:prefs:ver');
  } catch (e) {
    // ignore publish failures; client fallback polling will still pick updates
  }
}

async function loadInitial(redis: Redis) {
  try {
    const latest = await redis.get('ui:prefs:latest');
    const ver = await redis.get<number>('ui:prefs:ver');
    if (ver) lastVer = Number(ver) || 0;
    if (latest && typeof latest === 'object') {
      const evt = latest as any;
      const current = getLatestPreferencesEvent();
      if (!current || new Date(evt.updatedAt).getTime() > new Date(current.updatedAt || 0).getTime()) {
        setLatestPreferencesEvent(evt);
      }
    }
  } catch {}
}

export function startPreferencesWatcher() {
  if (started) return;
  const redis = getRedis();
  if (!redis) {
    started = true; // mark started to avoid loops even without redis
    return;
  }
  started = true;
  void loadInitial(redis);
  timer = setInterval(async () => {
    try {
      const ver = await redis.get<number>('ui:prefs:ver');
      const num = ver ? Number(ver) : 0;
      if (num && num !== lastVer) {
        lastVer = num;
        const latest = await redis.get('ui:prefs:latest');
        if (latest && typeof latest === 'object') {
          setLatestPreferencesEvent(latest as any);
        }
      }
    } catch {
      // ignore
    }
  }, 500);
}
