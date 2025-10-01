#!/usr/bin/env node

/**
 * TTFT benchmark for HyperChat6 SSE endpoint
 * Node 20+ required
 *
 * Usage:
 *   node scripts/ttft-benchmark.mjs --base https://your-deploy.vercel.app --runs 10 --scenarios simple,correction
 * Options:
 *   --base       Base URL of the deployment (required)
 *   --runs       Number of runs per scenario (default: 10)
 *   --scenarios  Comma-separated: simple,correction (default: simple,correction)
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.split('=');
    if (k.startsWith('--')) return [k.slice(2), v ?? true];
    return [k, v ?? true];
  })
);

const BASE = args.base;
const RUNS = Number(args.runs || 10);
const SCENARIOS = String(args.scenarios || 'simple,correction')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!BASE) {
  console.error('Missing --base. Example: --base=https://your-deploy.vercel.app');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function percentile(arr, p) {
  if (!arr.length) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function now() {
  // high-resolution if available
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

function newIds() {
  const id = Math.random().toString(36).slice(2);
  return {
    threadId: 'bench-' + id,
    threadItemId: 'item-' + id,
    parentThreadItemId: '',
  };
}

function buildBody(scenario) {
  const ids = newIds();
  if (scenario === 'correction') {
    const items = Array.from({ length: 250 }, (_, i) => `ITEM ${i + 1}`).join('\n');
    return {
      ...ids,
      prompt: `Corrige et standardise les libellés suivants en tableau Markdown.\n${items}`,
      messages: [],
      mode: 'correction',
      webSearch: false,
      showSuggestions: false,
    };
  }
  // simple
  return {
    ...ids,
    prompt: 'Explique brièvement ce qu’est le streaming SSE. Réponds en une phrase.',
    messages: [],
    mode: 'gemini-2.5-flash',
    webSearch: false,
    showSuggestions: false,
  };
}

async function runOnce(scenario) {
  const body = buildBody(scenario);
  const url = `${BASE.replace(/\/$/, '')}/api/completion`;

  let clientT0 = now();
  let clientT1 = null; // first start event
  let clientT2 = null; // first delta event
  let serverT1 = null; // from metrics event
  let serverT2 = null; // from metrics event

  const controller = new AbortController();
  const req = fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
    cache: 'no-store',
    signal: controller.signal,
  });

  let res;
  try {
    res = await req;
  } catch (e) {
    return { ok: false, error: 'network', scenario };
  }

  if (!res.ok) {
    return { ok: false, error: `http_${res.status}`, scenario };
  }
  if (!res.body) {
    return { ok: false, error: 'no_body', scenario };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const deadline = now() + 30000; // 30s timeout safety

  try {
    while (true) {
      if (now() > deadline) {
        controller.abort();
        return { ok: false, error: 'timeout', scenario };
      }
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || '';

      for (const message of messages) {
        if (!message.trim()) continue;
        const eventMatch = message.match(/^event: (.+)$/m);
        const dataMatch = message.match(/^data: (.+)$/m);
        if (!eventMatch || !dataMatch) continue;
        const event = eventMatch[1].trim();
        let data;
        try { data = JSON.parse(dataMatch[1]); } catch { data = null; }

        if (event === 'start' && clientT1 == null) clientT1 = now();
        if (event === 'delta' && clientT2 == null) clientT2 = now();
        if (event === 'metrics' && data?.ttft) {
          if (typeof data.ttft.t1_minus_t0 === 'number') serverT1 = data.ttft.t1_minus_t0;
          if (typeof data.ttft.t2_minus_t0 === 'number') serverT2 = data.ttft.t2_minus_t0;
        }
        if (event === 'done') {
          // finish
          return {
            ok: true,
            scenario,
            client: {
              t1_minus_t0_ms: clientT1 != null ? clientT1 - clientT0 : null,
              t2_minus_t0_ms: clientT2 != null ? clientT2 - clientT0 : null,
            },
            server: {
              t1_minus_t0_ms: serverT1,
              t2_minus_t0_ms: serverT2,
            },
          };
        }
      }
    }
  } catch (e) {
    return { ok: false, error: 'read_error', scenario };
  }

  return { ok: false, error: 'stream_ended_without_done', scenario };
}

async function runScenario(name) {
  const results = [];
  for (let i = 0; i < RUNS; i++) {
    const r = await runOnce(name);
    results.push(r);
    // avoid rate limiting bursts
    await sleep(200);
  }
  const ok = results.filter((r) => r.ok);
  const clientT1 = ok.map((r) => r.client.t1_minus_t0_ms).filter((x) => typeof x === 'number');
  const clientT2 = ok.map((r) => r.client.t2_minus_t0_ms).filter((x) => typeof x === 'number');
  const serverT1 = ok.map((r) => r.server.t1_minus_t0_ms).filter((x) => typeof x === 'number');
  const serverT2 = ok.map((r) => r.server.t2_minus_t0_ms).filter((x) => typeof x === 'number');

  const summary = {
    scenario: name,
    runs: RUNS,
    successes: ok.length,
    failures: results.length - ok.length,
    client: {
      t1_p50: percentile(clientT1, 50),
      t1_p95: percentile(clientT1, 95),
      t2_p50: percentile(clientT2, 50),
      t2_p95: percentile(clientT2, 95),
    },
    server: {
      t1_p50: percentile(serverT1, 50),
      t1_p95: percentile(serverT1, 95),
      t2_p50: percentile(serverT2, 50),
      t2_p95: percentile(serverT2, 95),
    },
    failures_detail: results.filter((r) => !r.ok).map((r) => r.error),
  };
  return { summary, results };
}

(async function main() {
  const outputs = [];
  for (const scenario of SCENARIOS) {
    console.log(`\n== Running scenario: ${scenario} (${RUNS} runs) ==`);
    const out = await runScenario(scenario);
    outputs.push(out);
    console.log(JSON.stringify(out.summary, null, 2));
  }
  console.log('\nDone.');
})();
