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

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map(s => s.trim());
};

const parseCSVRecords = (text: string) => {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const headerIndex = lines.findIndex(l => /^libelle_principal\s*,/i.test(l));
  if (headerIndex === -1) return [] as Array<{ libelle_principal: string; code_barres_initial: string; numero_fournisseur_unique: string; numero_article: string }>;
  const header = parseCSVLine(lines[headerIndex]).map(h => h.toLowerCase());
  const idx = {
    lib: header.indexOf('libelle_principal'),
    ean: header.indexOf('code_barres_initial'),
    nor: header.indexOf('numero_fournisseur_unique'),
    art: header.indexOf('numero_article'),
  };
  if (idx.lib < 0 || idx.ean < 0 || idx.nor < 0 || idx.art < 0) return [] as any[];
  const records: Array<{ libelle_principal: string; code_barres_initial: string; numero_fournisseur_unique: string; numero_article: string }> = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (!row.length) continue;
    const lib = row[idx.lib] || '';
    const ean = row[idx.ean] || '';
    const nor = row[idx.nor] || '';
    const art = row[idx.art] || '';
    if (lib && ean && nor && art) {
      records.push({ libelle_principal: lib, code_barres_initial: ean, numero_fournisseur_unique: nor, numero_article: art });
    }
  }
  return records;
};

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

    // Try CSV multi-ligne d'abord
    const csvItems = parseCSVRecords(question);
    const toRow = (arr: any[]) => `| ${arr.map(v => safeString(v)).join(' | ')} |`;

    const classify = async (normalizedLabel: string) => {
      let AA: string = FallbackCodes.AA;
      let AB: string = FallbackCodes.AB;
      let AC: string = FallbackCodes.AC;
      let AD: string = FallbackCodes.AD;
      try {
        const clsResponse = await generateText({
          prompt: GEMINI_SPECIALIZED_PROMPT + '\n\nRéponds uniquement avec un JSON compact contenant les 4 codes de classification pour ce libellé: {"AA":"..","AB":"..","AC":"..","AD":".."}. Aucune explication.',
          model: ModelEnum.GEMINI_2_5_FLASH,
          messages: [{ role: 'user', content: `Libellé: ${normalizedLabel}` }] as any,
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
      return { AA, AB, AC, AD };
    };

    const buildRowForItem = async (item: { libelle_principal: string; code_barres_initial: string; numero_fournisseur_unique: string; numero_article: string }) => {
      const values: Record<string, string> = {};
      for (let i = 0; i < HEADERS_CODES.length; i++) {
        const code = HEADERS_CODES[i];
        if (COPY_FROM_REF_CODES.has(code)) {
          const refVal = safeString((REF_ROW as any)[i] ?? '');
          if (refVal) values[code] = refVal;
        }
      }
      const normalizedLabel = collapseSpaces(stripAccents(safeString(item.libelle_principal).toUpperCase()));
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
      const ean = safeString(item.code_barres_initial);
      if (ean) values['CEANAR'] = truncate(ean, CODE_LENGTHS['CEANAR'] || 20);
      const art = safeString(item.numero_article);
      if (art) values['NARTAR'] = art;
      if (!values['CEANAR']) values['GENECB'] = '1'; else values['GENECB'] = '';
      const { AA, AB, AC, AD } = await classify(normalizedLabel);
      values['CSECAR'] = AA;
      values['CRAYAR'] = AB;
      values['CFAMAR'] = AC;
      values['CSFAAR'] = AD;
      const nor = safeString(item.numero_fournisseur_unique);
      if (nor) values['NORAEF'] = nor;
      return HEADERS_CODES.map(code => safeString(values[code] ?? ''));
    };

    if (csvItems && csvItems.length > 0) {
      const rows: string[] = [];
      rows.push(toRow(HEADERS_LONG));
      rows.push(toRow(HEADERS_CODES));
      for (const it of csvItems.slice(0, 300)) {
        const r = await buildRowForItem(it);
        rows.push(toRow(r));
      }
      const table = rows.join('\n');
      updateAnswer({ text: table, finalText: table, status: 'COMPLETED' });
      updateStatus('COMPLETED');
      context?.update('answer', _ => table);
      context?.get('onFinish')?.({
        answer: table,
        threadId: context?.get('threadId'),
        threadItemId: context?.get('threadItemId'),
        mode: 'creation-d-article',
      });
      return table;
    }

    const libelle_principal = safeString(payload?.libelle_principal);
    const code_barres_initial = safeString(payload?.code_barres_initial);
    const numero_fournisseur_unique = safeString(payload?.numero_fournisseur_unique);
    const numero_article = safeString(payload?.numero_article);

    if (!libelle_principal || !code_barres_initial || !numero_fournisseur_unique || !numero_article) {
      const help = [
        'Ce mode nécessite 4 champs obligatoires:',
        "- libelle_principal (ex: CAHIER DE POESIE 170X220 48P INCOLO)",
        "- code_barres_initial (ex: 3020120014739)",
        "- numero_fournisseur_unique (ex: 273)",
        "- numero_article (ex: 136246)",
        '',
        'Vous pouvez aussi fournir un CSV (Option B) :',
        'libelle_principal,code_barres_initial,numero_fournisseur_unique,numero_article',
        'YAOURT GREC NATURE 150G,3760123456789,273,987654',
        'CHIPS NATURE 150G,3760123456222,273,348763',
      ].join('\n');
      updateAnswer({ text: help, finalText: help, status: 'COMPLETED' });
      updateStatus('COMPLETED');
      context?.update('answer', _ => help);
      return help;
    }

    // Mono-article (comportement existant)
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

    const { AA, AB, AC, AD } = await classify(normalizedLabel);

    values['CSECAR'] = AA;
    values['CRAYAR'] = AB;
    values['CFAMAR'] = AC;
    values['CSFAAR'] = AD;

    if (numero_fournisseur_unique) {
      values['NORAEF'] = numero_fournisseur_unique;
    }

    const valuesRow = HEADERS_CODES.map(code => safeString(values[code] ?? ''));

    const table = [toRow(HEADERS_LONG), toRow(HEADERS_CODES), toRow(valuesRow)].join('\n');

    updateAnswer({ text: table, finalText: table, status: 'COMPLETED' });

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
