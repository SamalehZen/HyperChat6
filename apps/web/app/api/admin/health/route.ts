import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/_lib/auth';
import { prisma } from '@repo/prisma';

const DJIBOUTI_TZ_OFFSET_MINUTES = 180; // UTC+03

function parseWindow(param: string | null): '24h' | '7j' | '30j' {
  if (!param) return '7j';
  const p = param.toLowerCase();
  if (p === '24h') return '24h';
  if (p === '7d' || p === '7j') return '7j';
  if (p === '30d' || p === '30j') return '30j';
  return '7j';
}

function addHours(d: Date, n: number) { const x = new Date(d); x.setHours(x.getHours()+n); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function shiftToTZ(d: Date) { return new Date(d.getTime() + DJIBOUTI_TZ_OFFSET_MINUTES * 60 * 1000); }
function shiftFromTZ(d: Date) { return new Date(d.getTime() - DJIBOUTI_TZ_OFFSET_MINUTES * 60 * 1000); }

function getRange(windowSel: '24h'|'7j'|'30j') {
  const now = new Date();
  const nowTz = shiftToTZ(now);
  if (windowSel === '24h') {
    const endTz = nowTz;
    const startTz = addHours(endTz, -24);
    return { start: shiftFromTZ(startTz), end: shiftFromTZ(endTz) };
  }
  const days = windowSel === '7j' ? 7 : 30;
  const endTz = endOfDay(nowTz);
  const startTz = startOfDay(addDays(endTz, - (days - 1)));
  return { start: shiftFromTZ(startTz), end: shiftFromTZ(endTz) };
}

function p95(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a,b)=>a-b);
  const idx = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

const PROVIDER_ENV: Record<string, { env: string; label: string }> = {
  openai: { env: 'OPENAI_API_KEY', label: 'OpenAI' },
  anthropic: { env: 'ANTHROPIC_API_KEY', label: 'Anthropic' },
  google: { env: 'GEMINI_API_KEY', label: 'Google Gemini' },
  fireworks: { env: 'FIREWORKS_API_KEY', label: 'Fireworks' },
  together: { env: 'TOGETHER_API_KEY', label: 'Together' },
};

export async function GET(request: NextRequest) {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const windowSel = parseWindow(searchParams.get('window'));

  const range = getRange(windowSel);
  const prevWindowSel = windowSel; // same duration shifted back
  const prevRange = { start: new Date(range.start.getTime() - (range.end.getTime() - range.start.getTime())), end: new Date(range.end.getTime() - (range.end.getTime() - range.start.getTime())) };

  const logs = await prisma.messageLog.findMany({
    where: { createdAt: { gte: range.start, lte: range.end } },
    select: { provider: true, latencyMs: true, status: true },
  });
  const prevLogs = await prisma.messageLog.findMany({
    where: { createdAt: { gte: prevRange.start, lte: prevRange.end } },
    select: { provider: true, latencyMs: true, status: true },
  });

  const providersSet = new Set(logs.map(l => l.provider));
  const rows = Array.from(providersSet).map((prov) => {
    const env = PROVIDER_ENV[prov] || { env: '', label: prov };
    const hasKey = env.env ? !!process.env[env.env as keyof typeof process.env] : false;
    const items = logs.filter(l => l.provider === prov);
    const total = items.length;
    const completed = items.filter(i => i.status === 'COMPLETED');
    const errors = items.filter(i => i.status === 'ERROR' || i.status === 'ABORTED');
    const latencies = completed.map(i => i.latencyMs);
    const latencyAvg = completed.length ? Math.round(latencies.reduce((a,b)=>a+b,0) / completed.length) : 0;
    const latencyP95 = Math.round(p95(latencies));
    const errorRate = total ? (errors.length / total) * 100 : 0;

    let status: 'ok' | 'warn' | 'down' = 'ok';
    if (!hasKey) status = 'warn';
    else if (errorRate > 15) status = 'down';
    else if (errorRate > 5) status = 'warn';

    return {
      provider: env.label,
      keyPresent: hasKey,
      latencyAvgMs: latencyAvg,
      latencyP95Ms: latencyP95,
      errorRatePct: Number(errorRate.toFixed(1)),
      status,
      _meta: { prov, total, completed: completed.length },
    };
  });

  // Overall weighted averages
  const totalCount = rows.reduce((a, r) => a + r._meta.total, 0);
  const completedCount = rows.reduce((a, r) => a + r._meta.completed, 0);
  const overall = {
    latencyAvgMs: completedCount ? Math.round(rows.reduce((a, r) => a + r.latencyAvgMs * r._meta.completed, 0) / completedCount) : 0,
    latencyP95Ms: completedCount ? Math.round(rows.reduce((a, r) => a + r.latencyP95Ms * r._meta.completed, 0) / completedCount) : 0,
    errorRatePct: totalCount ? Number((rows.reduce((a, r) => a + (r.errorRatePct / 100) * r._meta.total, 0) / totalCount * 100).toFixed(1)) : 0,
    worstStatus: rows.some(r => r.status === 'down') ? 'down' : rows.some(r => r.status === 'warn') ? 'warn' : 'ok',
  } as const;

  // Previous overall for deltas
  const prevProvSet = new Set(prevLogs.map(l => l.provider));
  const prevRows = Array.from(prevProvSet).map((prov) => {
    const items = prevLogs.filter(l => l.provider === prov);
    const total = items.length;
    const completed = items.filter(i => i.status === 'COMPLETED');
    const errors = items.filter(i => i.status === 'ERROR' || i.status === 'ABORTED');
    const latencies = completed.map(i => i.latencyMs);
    const latencyAvg = completed.length ? Math.round(latencies.reduce((a,b)=>a+b,0) / completed.length) : 0;
    const latencyP95 = Math.round(p95(latencies));
    const errorRate = total ? (errors.length / total) * 100 : 0;
    return { latencyAvgMs: latencyAvg, latencyP95Ms: latencyP95, errorRatePct: Number(errorRate.toFixed(1)), _meta: { total, completed: completed.length } };
  });
  const prevTotalCount = prevRows.reduce((a, r) => a + r._meta.total, 0);
  const prevCompletedCount = prevRows.reduce((a, r) => a + r._meta.completed, 0);
  const previousOverall = {
    latencyAvgMs: prevCompletedCount ? Math.round(prevRows.reduce((a, r) => a + r.latencyAvgMs * r._meta.completed, 0) / prevCompletedCount) : 0,
    latencyP95Ms: prevCompletedCount ? Math.round(prevRows.reduce((a, r) => a + r.latencyP95Ms * r._meta.completed, 0) / prevCompletedCount) : 0,
    errorRatePct: prevTotalCount ? Number((prevRows.reduce((a, r) => a + (r.errorRatePct / 100) * r._meta.total, 0) / prevTotalCount * 100).toFixed(1)) : 0,
    worstStatus: 'ok' as const,
  };

  // Strip meta for providers response
  const providers = rows.map(({ _meta, ...rest }) => ({ key: (_meta as any)?.prov, ...rest }));

  return NextResponse.json({ window: windowSel, providers, overall, previousOverall });
}
