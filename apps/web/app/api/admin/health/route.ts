import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/_lib/auth';

function parseWindow(param: string | null): '24h' | '7d' | '30d' {
  if (!param) return '24h';
  const p = param.toLowerCase();
  if (p === '7d' || p === '30d') return p;
  return '24h';
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

export async function GET(request: NextRequest) {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const windowSel = parseWindow(searchParams.get('window'));

  const providers: Array<{ key: string; env: string; name: string }> = [
    { key: 'openai', env: 'OPENAI_API_KEY', name: 'OpenAI' },
    { key: 'anthropic', env: 'ANTHROPIC_API_KEY', name: 'Anthropic' },
    { key: 'gemini', env: 'GEMINI_API_KEY', name: 'Google Gemini' },
  ];

  const rows = providers.map(p => {
    const hasKey = !!process.env[p.env];
    const baseAvg = p.key === 'openai' ? 850 : p.key === 'anthropic' ? 900 : 780;
    const baseP95 = p.key === 'openai' ? 1900 : p.key === 'anthropic' ? 2000 : 1700;
    const avg = clamp(baseAvg + (Math.random() - 0.5) * 120, 500, 2500);
    const p95 = clamp(baseP95 + (Math.random() - 0.5) * 200, 800, 4000);
    const errorRate = hasKey ? clamp(0.6 + Math.random() * 1.2, 0.2, 3.5) : 0; // %

    let status: 'ok' | 'warn' | 'down' = 'ok';
    if (!hasKey) status = 'warn';
    else if (errorRate > 5 || p95 > 3500) status = 'down';
    else if (errorRate > 2 || p95 > 2200) status = 'warn';

    return {
      provider: p.name,
      keyPresent: hasKey,
      latencyAvgMs: Math.round(avg),
      latencyP95Ms: Math.round(p95),
      errorRatePct: Number(errorRate.toFixed(1)),
      status,
    };
  });

  const overall = {
    latencyAvgMs: Math.round(rows.reduce((a, r) => a + r.latencyAvgMs, 0) / Math.max(1, rows.length)),
    latencyP95Ms: Math.round(rows.reduce((a, r) => a + r.latencyP95Ms, 0) / Math.max(1, rows.length)),
    errorRatePct: Number((rows.reduce((a, r) => a + r.errorRatePct, 0) / Math.max(1, rows.length)).toFixed(1)),
    worstStatus: rows.some(r => r.status === 'down') ? 'down' : rows.some(r => r.status === 'warn') ? 'warn' : 'ok',
  } as const;

  return NextResponse.json({ window: windowSel, providers: rows, overall });
}
