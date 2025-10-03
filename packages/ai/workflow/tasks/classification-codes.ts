import { ModelEnum } from '../../models';
import { generateText } from '../utils';
import { GEMINI_SPECIALIZED_PROMPT } from './gemini-specialized-prompt';

const classificationCache = new Map<string, { AA: string; AB: string; AC: string; AD: string }>();

const safeString = (v: any) => (v === undefined || v === null ? '' : String(v));

function parseCodes(text: string) {
  try {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      const obj = JSON.parse(text.slice(first, last + 1));
      return {
        AA: safeString(obj?.AA || obj?.aa),
        AB: safeString(obj?.AB || obj?.ab),
        AC: safeString(obj?.AC || obj?.ac),
        AD: safeString(obj?.AD || obj?.ad),
      };
    }
  } catch {}
  const reAA = /\bAA\s*[:=]\s*['\"]?(\d{2})/i.exec(text);
  const reAB = /\bAB\s*[:=]\s*['\"]?(\d{3})/i.exec(text);
  const reAC = /\bAC\s*[:=]\s*['\"]?(\d{3})/i.exec(text);
  const reAD = /\bAD\s*[:=]\s*['\"]?(\d{3})/i.exec(text);
  return {
    AA: safeString(reAA?.[1] || ''),
    AB: safeString(reAB?.[1] || ''),
    AC: safeString(reAC?.[1] || ''),
    AD: safeString(reAD?.[1] || ''),
  };
}

async function askModel(normalizedLabel: string, model: ModelEnum, signal?: AbortSignal) {
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  signal?.addEventListener('abort', onAbort, { once: true } as any);
  const timer = setTimeout(() => ac.abort(), 12000);
  try {
    const res = await generateText({
      prompt:
        GEMINI_SPECIALIZED_PROMPT +
        '\n\nRéponds uniquement avec un JSON strict: {"AA":"..","AB":"..","AC":"..","AD":".."}. Les codes doivent exister dans la hiérarchie ci‑dessus. Aucune explication.',
      model,
      messages: [{ role: 'user', content: `Libellé: ${normalizedLabel}` }] as any,
      signal: ac.signal,
    });
    return parseCodes(res || '');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', onAbort as any);
  }
}

export async function classifyCodesByEngine(normalizedLabel: string, signal?: AbortSignal) {
  if (classificationCache.has(normalizedLabel)) return classificationCache.get(normalizedLabel)!;

  let AA = '', AB = '', AC = '', AD = '';
  try {
    let parsed = await askModel(normalizedLabel, ModelEnum.GEMINI_2_5_FLASH, signal);
    if (/^\d{2}$/.test(parsed.AA)) AA = parsed.AA;
    if (/^\d{3}$/.test(parsed.AB)) AB = parsed.AB;
    if (/^\d{3}$/.test(parsed.AC)) AC = parsed.AC;
    if (/^\d{3}$/.test(parsed.AD)) AD = parsed.AD;
    const ok = /^\d{2}$/.test(AA) && /^\d{3}$/.test(AB) && /^\d{3}$/.test(AC) && /^\d{3}$/.test(AD);
    if (!ok) {
      // Second essai Flash uniquement
      parsed = await askModel(normalizedLabel, ModelEnum.GEMINI_2_5_FLASH, signal);
      if (/^\d{2}$/.test(parsed.AA)) AA = parsed.AA;
      if (/^\d{3}$/.test(parsed.AB)) AB = parsed.AB;
      if (/^\d{3}$/.test(parsed.AC)) AC = parsed.AC;
      if (/^\d{3}$/.test(parsed.AD)) AD = parsed.AD;
    }
  } catch {}
  const result = { AA, AB, AC, AD };
  classificationCache.set(normalizedLabel, result);
  return result;
}
