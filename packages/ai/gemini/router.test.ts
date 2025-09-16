import { describe, it, expect, beforeEach } from 'vitest';
import { GeminiModelRouter, QuotaExhaustedError } from './router';

describe('GeminiModelRouter', () => {
  let router: GeminiModelRouter;

  beforeEach(() => {
    router = new GeminiModelRouter({
      apiKey: 'test',
      primaryModel: 'gemini-2.5-pro',
      fallbackModel: 'gemini-2.5-flash',
      primaryDailyLimit: 2,
      fallbackDailyLimit: 3,
      enableFallback: true,
    });
  });

  it('returns primary by default', () => {
    expect(router.getActiveModelName()).toBe('gemini-2.5-pro');
  });

  it('falls back when primary limit reached', async () => {
    // Use primary twice to hit limit 2
    const r1 = await router.withModel(async (name) => name);
    const r2 = await router.withModel(async (name) => name);
    expect(r1.usedModel).toBe('gemini-2.5-pro');
    expect(r1.fellBack).toBe(false);
    // After two attempts, next should fallback
    const r3 = await router.withModel(async (name) => name);
    expect(r3.usedModel).toBe('gemini-2.5-flash');
    expect(r3.fellBack).toBe(true);
  });

  it('falls back on 429/quota error from primary', async () => {
    const local = new GeminiModelRouter({
      apiKey: 'test',
      primaryModel: 'gemini-2.5-pro',
      fallbackModel: 'gemini-2.5-flash',
      primaryDailyLimit: 50,
      fallbackDailyLimit: 50,
      enableFallback: true,
    });

    let calls = 0;
    const res = await local.withModel(async (name) => {
      calls++;
      if (name === 'gemini-2.5-pro') {
        const err: any = new Error('quota exceeded');
        (err as any).status = 429;
        throw err;
      }
      return name;
    });

    expect(calls).toBe(2);
    expect(res.usedModel).toBe('gemini-2.5-flash');
    expect(res.fellBack).toBe(true);
  });

  it('does not fallback on non-quota error', async () => {
    await expect(
      router.withModel(async (name) => {
        if (name === 'gemini-2.5-pro') throw new Error('network down');
        return name;
      })
    ).rejects.toThrow('network down');
  });

  it('throws when both limits exhausted', async () => {
    const local = new GeminiModelRouter({
      apiKey: 'test',
      primaryModel: 'gemini-2.5-pro',
      fallbackModel: 'gemini-2.5-flash',
      primaryDailyLimit: 0,
      fallbackDailyLimit: 0,
      enableFallback: true,
    });
    await expect(local.withModel(async (n) => n)).rejects.toBeInstanceOf(QuotaExhaustedError);
  });

  it('resets counters on date change', async () => {
    // Force counters to a previous date then ensure reset occurs
    // @ts-expect-error private access for testing only
    router['counters'].date = '1970-01-01';
    const beforePrimary = router.getActiveModelName();
    expect(beforePrimary).toBe('gemini-2.5-pro');
    // @ts-expect-error private access for testing only
    expect(router['counters'].counts['gemini-2.5-pro']).toBe(0);
    // Use once
    await router.withModel(async (name) => name);
    // @ts-expect-error private access for testing only
    expect(router['counters'].counts['gemini-2.5-pro']).toBe(1);
  });
});
