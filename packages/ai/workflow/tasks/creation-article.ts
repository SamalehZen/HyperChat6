import { createTask } from '@repo/orchestrator';
import { ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { generateText, handleError, sendEvents } from '../utils';
import { GEMINI_SPECIALIZED_PROMPT } from './gemini-specialized-prompt';
import { HEADERS_LONG, HEADERS_CODES, REF_ROW, MAX_LENGTHS } from '../prompts/arkabase-article-structure';

const stripAccents = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');

const safeString = (v: any) => (v === undefined || v === null ? '' : String(v));
const collapseSpaces = (s: string) => s.replace(/\s+/g, ' ').trim();
const truncate = (s: string, max: number) => (safeString(s).length > max ? safeString(s).slice(0, max) : safeString(s));

const CODE_LENGTHS: Record<string, number> = {
  LARTAR: MAX_LENGTHS['B'],
  MDIRAR: MAX_LENGTHS['C'],
  LAREAR: MAX_LENGTHS['D'],
  LREDAR: MAX_LENGTHS['E'],
  LETIAR: MAX_LENGTHS['J'],
  LARFEF: MAX_LENGTHS['AW'],
  CEANAR: MAX_LENGTHS['I'],
};

const COPY_FROM_REF_CODES = new Set<string>([
  'TYPRAR','CSTAAR','TREFAR','CAL1AR','CAL2AR','TYALAR','STALAR','STATAR','UCOSVA','CVENVA','PBUEVA','PNETVA','CENTVA','TYPXVA','DEGRAR','UTARUT','UTVLUT','DACTEF','STAFEF','NARCVA','HAUEVA','LAUEVA','LOUEVA','MVENVA','SSUCVA','SEALAR','NVLOVC','LVLOVC','TYVLVC','NVLIVC','NBSPVC','NBPCVC','NCOUVC','NBUEVC','PBUEVC','PNETVC','HAUEVC','LAUEVC','LOUEVC','NARCVC','CSTAVC','NVLOVP','NVLIVP','NBSPVP','NBPCVP','NCOUVP','NBUEVP','PBUEVP','PNETVP','HAUEVP','LAUEVP','LOUEVP','NARCVP','AGCEAR','ARSKAR','DSTXAR','DLPEAR','TMINAR','TMAXAR','NENTK1','DAPLK1','REASK1','TYREK1','NEN1KA','NVLOEF','USTCEF','QCDNEF','QCDXEF','INCREF','TYREEF','ORAPEF','NENTV1','NVLOV1','QCDNV1','QCDXV1','INCRV1','TYETAR','NBETAR','LETIAL','LREDAL','CLANAL','POCLVQ','PTARVQ','GRBAVQ','TYBAVQ','LIB1LE','LIB2LE','LIB3LE','LIB4LE','LIB5LE','NARXAX','ARDRAX'
]);

const FallbackCodes = { AA: '07', AB: '074', AC: '742', AD: '206' } as const;

export const creationArticleTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
  name: 'creation-article',
  execute: async ({ events, context, signal }) => {
    const { updateAnswer, updateStatus } = sendEvents(events);
    updateAnswer({ text: '', status: 'PENDING' });

    const question = safeString(context?.get('question') || '');
    const messages = (context?.get('messages') || []) as any[];

    const extractJson = (text: string): any | null => {
      try {
        const first = text.indexOf('{');
        const last = text.lastIndexOf('}');
        if (first !== -1 && last !== -1 && last > first) {
          const jsonStr = text.slice(first, last + 1);
          return JSON.parse(jsonStr);
        }
      } catch {}
      return null;
    };

    const parseKeyValue = (text: string): any => {
      const obj: any = {};
      const re = /(libelle_principal|code_barres_initial|numero_fournisseur_unique|numero_article)\s*[:=]\s*([\"']?)([^\n\"']+)\2/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        obj[m[1]] = m[3].trim();
      }
      return obj;
    };

    const payload = extractJson(question) || extractJson(safeString(messages?.[messages.length - 1]?.content || '')) || parseKeyValue(question);

    const libelle_principal = safeString(payload?.libelle_principal);
    const code_barres_initial = safeString(payload?.code_barres_initial);
    const numero_fournisseur_unique = safeString(payload?.numero_fournisseur_unique);
    const numero_article = safeString(payload?.numero_article);

    const normalizedLabel = collapseSpaces(stripAccents(libelle_principal.toUpperCase()));

    const values: Record<string, string> = {};

    for (let i = 0; i < HEADERS_CODES.length; i++) {
      const code = HEADERS_CODES[i];
      if (COPY_FROM_REF_CODES.has(code)) {
        const refVal = safeString((REF_ROW as any)[i] ?? '');
        if (refVal) values[code] = refVal;
      }
    }

    const applyLabel = (code: string) => {
      const max = CODE_LENGTHS[code] || 9999;
      values[code] = truncate(normalizedLabel, max);
    };

    applyLabel('LARTAR');
    applyLabel('MDIRAR');
    applyLabel('LAREAR');
    applyLabel('LREDAR');
    applyLabel('LETIAR');
    applyLabel('LARFEF');

    if (code_barres_initial) {
      values['CEANAR'] = truncate(code_barres_initial, CODE_LENGTHS['CEANAR'] || 20);
    }

    if (numero_article) {
      values['NARTAR'] = numero_article;
    }

    if (!values['CEANAR']) {
      values['GENECB'] = '1';
    } else {
      values['GENECB'] = '';
    }

    let AA = FallbackCodes.AA;
    let AB = FallbackCodes.AB;
    let AC = FallbackCodes.AC;
    let AD = FallbackCodes.AD;

    try {
      const clsResponse = await generateText({
        prompt: GEMINI_SPECIALIZED_PROMPT + '\n\nRéponds uniquement avec un JSON compact contenant les 4 codes de classification pour ce libellé: {"AA":"..","AB":"..","AC":"..","AD":".."}. Aucune explication.',
        model: ModelEnum.GEMINI_2_5_FLASH,
        messages: [
          { role: 'user', content: `Libellé: ${normalizedLabel}` },
        ] as any,
        signal,
      });

      const getCodes = (text: string) => {
        try {
          const first = text.indexOf('{');
          const last = text.lastIndexOf('}');
          if (first !== -1 && last !== -1 && last > first) {
            const jsonStr = text.slice(first, last + 1);
            const obj = JSON.parse(jsonStr);
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
      };

      const parsed = getCodes(clsResponse || '');
      if (/^\d{2}$/.test(parsed.AA)) AA = parsed.AA;
      if (/^\d{3}$/.test(parsed.AB)) AB = parsed.AB;
      if (/^\d{3}$/.test(parsed.AC)) AC = parsed.AC;
      if (/^\d{3}$/.test(parsed.AD)) AD = parsed.AD;
    } catch {}

    values['AA'] = AA;
    values['AB'] = AB;
    values['AC'] = AC;
    values['AD'] = AD;

    if (numero_fournisseur_unique) {
      values['NORAEF'] = numero_fournisseur_unique;
    }

    const toRow = (arr: any[]) => `| ${arr.map(v => safeString(v)).join(' | ')} |`;

    const valuesRow = HEADERS_CODES.map(code => safeString(values[code] ?? ''));

    const table = [toRow(HEADERS_LONG), toRow(HEADERS_CODES), toRow(valuesRow)].join('\n');

    updateAnswer({ text: '', finalText: table, status: 'COMPLETED' });

    context?.get('onFinish')?.({
      answer: table,
      threadId: context?.get('threadId'),
      threadItemId: context?.get('threadItemId'),
      mode: 'creation-d-article',
    });

    updateStatus('COMPLETED');
    context?.update('answer', _ => table);

    return table;
  },
  onError: handleError,
  route: ({ context }) => {
    if (context?.get('showSuggestions') && context.get('answer')) {
      return 'suggestions';
    }
    return 'end';
  },
});
