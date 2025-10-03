import { ModelEnum } from '../../models';
import { generateText } from '../utils';
import { GEMINI_SPECIALIZED_PROMPT } from './gemini-specialized-prompt';

export function validateCodes(AA?: string, AB?: string, AC?: string, AD?: string) {
  const aaOk = typeof AA === 'string' && /^\d{2}$/.test(AA);
  const abOk = typeof AB === 'string' && /^\d{3}$/.test(AB);
  const acOk = typeof AC === 'string' && /^\d{3}$/.test(AC);
  const adOk = typeof AD === 'string' && /^\d{3}$/.test(AD);
  return aaOk && abOk && acOk && adOk;
}

export function validateCodesDetailed(AA?: string, AB?: string, AC?: string, AD?: string) {
  const reasons: string[] = [];
  if (!(typeof AA === 'string' && /^\d{2}$/.test(AA))) reasons.push('AA invalide (attendu 2 chiffres)');
  if (!(typeof AB === 'string' && /^\d{3}$/.test(AB))) reasons.push('AB invalide (attendu 3 chiffres)');
  if (!(typeof AC === 'string' && /^\d{3}$/.test(AC))) reasons.push('AC invalide (attendu 3 chiffres)');
  if (!(typeof AD === 'string' && /^\d{3}$/.test(AD))) reasons.push('AD invalide (attendu 3 chiffres)');
  return { ok: reasons.length === 0, reasons };
}

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

async function askStep(rawLabel: string, level: 'AA' | 'AB' | 'AC' | 'AD', ctx: { AA?: string; AB?: string; AC?: string }, signal?: AbortSignal) {
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  signal?.addEventListener('abort', onAbort, { once: true } as any);
  const timer = setTimeout(() => ac.abort(), 10000);
  try {
    const system =
      GEMINI_SPECIALIZED_PROMPT +
      `\n\nRéponds uniquement avec un JSON strict pour le niveau ${level}.` +
      (level === 'AA'
        ? ` Format: {"AA":".."} (exactement 2 chiffres).`
        : level === 'AB'
        ? ` Format: {"AB":"..."} (exactement 3 chiffres) et cohérent avec AA="${ctx.AA ?? ''}".`
        : level === 'AC'
        ? ` Format: {"AC":"..."} (exactement 3 chiffres) et cohérent avec AA="${ctx.AA ?? ''}", AB="${ctx.AB ?? ''}".`
        : ` Format: {"AD":"..."} (exactement 3 chiffres) et cohérent avec AA="${ctx.AA ?? ''}", AB="${ctx.AB ?? ''}", AC="${ctx.AC ?? ''}".`);
    const res = await generateText({
      prompt: system,
      model: ModelEnum.GEMINI_2_5_FLASH,
      messages: [{ role: 'user', content: `Libellé: ${rawLabel}` }] as any,
      signal: ac.signal,
    });
    const parsed = parseCodes(res || '');
    return parsed;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', onAbort as any);
  }
}

export async function classifyCodesHierarchicalFlash(rawLabel: string, signal?: AbortSignal) {
  let AA = '', AB = '', AC = '', AD = '';
  // AA
  for (let attempt = 0; attempt < 2 && !/^\d{2}$/.test(AA); attempt++) {
    const p = await askStep(rawLabel, 'AA', {}, signal);
    if (p.AA && /^\d{2}$/.test(p.AA)) AA = p.AA;
  }
  // AB
  for (let attempt = 0; attempt < 2 && !/^\d{3}$/.test(AB); attempt++) {
    const p = await askStep(rawLabel, 'AB', { AA }, signal);
    if (p.AB && /^\d{3}$/.test(p.AB)) AB = p.AB;
  }
  // AC
  for (let attempt = 0; attempt < 2 && !/^\d{3}$/.test(AC); attempt++) {
    const p = await askStep(rawLabel, 'AC', { AA, AB }, signal);
    if (p.AC && /^\d{3}$/.test(p.AC)) AC = p.AC;
  }
  // AD
  for (let attempt = 0; attempt < 2 && !/^\d{3}$/.test(AD); attempt++) {
    const p = await askStep(rawLabel, 'AD', { AA, AB, AC }, signal);
    if (p.AD && /^\d{3}$/.test(p.AD)) AD = p.AD;
  }
  return { AA, AB, AC, AD };
}

