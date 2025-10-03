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

const validateAndCollectCSV = (text: string) => {
  const lines = text.split(/\r?\n/).map((s) => s.trim());
  const nonEmpty = lines.map((l, idx) => ({ line: l, idx })).filter((x) => x.line.length > 0);
  const headerIdxObj = nonEmpty.find((x) => /^(libelle_principal)\s*,\s*(code_barres_initial)\s*,\s*(numero_fournisseur_unique)\s*,\s*(numero_article)\s*$/i.test(x.line));
  if (!headerIdxObj) return { valid: [] as Array<{ libelle_principal: string; code_barres_initial: string; numero_fournisseur_unique: string; numero_article: string }>, errors: [] as string[] };
  const headerArr = parseCSVLine(headerIdxObj.line).map((h) => h.toLowerCase().trim());
  const idx = {
    lib: headerArr.indexOf('libelle_principal'),
    ean: headerArr.indexOf('code_barres_initial'),
    nor: headerArr.indexOf('numero_fournisseur_unique'),
    art: headerArr.indexOf('numero_article'),
  };
  if (idx.lib < 0 || idx.ean < 0 || idx.nor < 0 || idx.art < 0) {
    return { valid: [], errors: [] };
  }
  const errors: string[] = [];
  const valid: Array<{ libelle_principal: string; code_barres_initial: string; numero_fournisseur_unique: string; numero_article: string }> = [];
  for (let i = headerIdxObj.idx + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || !raw.trim()) continue;
    const row = parseCSVLine(raw);
    const lib = safeString(row[idx.lib]).trim();
    const ean = safeString(row[idx.ean]).trim();
    const nor = safeString(row[idx.nor]).trim();
    const art = safeString(row[idx.art]).trim();
    const rowErrors: string[] = [];
    if (!lib) rowErrors.push('champ manquant libelle_principal');
    if (!ean) rowErrors.push('champ manquant code_barres_initial');
    if (!nor) rowErrors.push('champ manquant numero_fournisseur_unique');
    if (!art) rowErrors.push('champ manquant numero_article');
    if (ean && ean.length > 20) rowErrors.push('longueur code_barres_initial > 20');
    if (rowErrors.length > 0) {
      const logicalLine = i - headerIdxObj.idx; // 1-based data row index
      errors.push(`Ligne ${logicalLine}: ${rowErrors.join('; ')}`);
      continue;
    }
    valid.push({ libelle_principal: lib, code_barres_initial: ean, numero_fournisseur_unique: nor, numero_article: art });
  }
  return { valid, errors };
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

    type FieldKey = 'libelle_principal' | 'code_barres_initial' | 'numero_fournisseur_unique' | 'numero_article';
    const REQUIRED_FIELDS: FieldKey[] = ['libelle_principal','code_barres_initial','numero_fournisseur_unique','numero_article'];

    const getExpectedFieldFromAssistant = (msgs: any[]): FieldKey | null => {
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (m?.role === 'assistant') {
          const t = safeString(m?.content || '');
          const match = t.match(/CREATION-ARTICLE:EXPECT\s*=\s*(\w+)/i);
          if (match) return match[1] as FieldKey;
        }
      }
      return null;
    };

    const getStateFromAssistant = (msgs: any[]): Partial<Record<FieldKey,string>> => {
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (m?.role === 'assistant') {
          const t = safeString(m?.content || '');
          const idx = t.lastIndexOf('CREATION-ARTICLE:STATE=');
          if (idx >= 0) {
            const after = t.slice(idx + 'CREATION-ARTICLE:STATE='.length).trim();
            try {
              const obj = JSON.parse(after);
              return obj as any;
            } catch {}
          }
        }
      }
      return {};
    };

    const extractStructured = (text: string) => extractJson(text) || parseKeyValue(text) || {};

    const aggregateFromMessages = (msgs: any[]) => {
      const acc: any = {};
      for (const m of msgs || []) {
        if (m?.role === 'user' && typeof m?.content === 'string') {
          const obj = extractStructured(m.content);
          Object.assign(acc, obj);
        }
      }
      return acc;
    };

    const state = getStateFromAssistant(messages);
    let payload = { ...state, ...aggregateFromMessages(messages), ...extractStructured(question) } as Partial<Record<FieldKey,string>>;

    // If previous assistant asked for a specific field and user sent plain text without keys, bind it
    const expected = getExpectedFieldFromAssistant(messages);
    if (expected && !payload?.[expected]) {
      const latestUser = [...(messages || [])].reverse().find(m => m?.role === 'user');
      const latestText = safeString(latestUser?.content || question || '');
      const hasKeys = /libelle_principal|code_barres_initial|numero_fournisseur_unique|numero_article/i.test(latestText);
      if (!hasKeys && latestText && latestText.length > 1) {
        payload[expected] = latestText.trim();
      }
    }

    const hasCsv = (() => { const tmp = validateAndCollectCSV(question); return tmp.valid.length > 0; })();
    const nextMissing = REQUIRED_FIELDS.find((f): f is FieldKey => !safeString((payload as any)[f]));
    if (!hasCsv && nextMissing) {
      const isDomainQuestion = /\?|\b(comment|combien|peux|puis-je|est-ce|pourquoi|quel(?:le|s)?|format|mod[èe]le|template|csv|xlsx|ean|colonn|ligne|ignor|limite|valid|doubl|num[ée]riq|import|export|résultat|tableau)\b/i.test(question);
      if (isDomainQuestion) {
        try {
          const system = `Tu es un assistant spécialisé pour la création d’article (cyrusEREF). Réponds uniquement aux questions liées à:\n- modèles CSV/XLSX et étapes d’import\n- 4 colonnes requises (libelle_principal, code_barres_initial ≤ 20, numero_fournisseur_unique, numero_article)\n- limites (max 300 lignes)\n- validation et commentaires d’import (lignes ignorées et raisons)\n- formatage/conseils pour obtenir le tableau final.\nNe réponds pas à des sujets hors de ce périmètre. Sois clair, concis et pratique.`;
          const answer = await generateText({
            prompt: system,
            model: ModelEnum.GEMINI_2_5_FLASH,
            messages: [{ role: 'user', content: question }] as any,
            signal,
          });
          const text = safeString(answer || '').trim() || 'Je peux aider uniquement sur l’import CSV/XLSX de création d’article. Téléchargez le modèle (CSV/XLSX), remplissez les 4 colonnes, puis importez pour obtenir le tableau.';
          updateAnswer({ text, finalText: text, status: 'COMPLETED' });
          updateStatus('COMPLETED');
          context?.update('answer', _ => text);
          return text;
        } catch {}
      }
      const intro = [
        'Je suis un agent spécialisé pour préparer le fichier Excel de création cyrusEREF, sans perte de temps.',
        '',
        'Procédez en 3 étapes rapides :',
        '1) Téléchargez le modèle: [CSV](/templates/article_import_template.csv) · [XLSX](/templates/article_import_template.xlsx)',
        '2) Remplissez exactement 4 colonnes: libelle_principal, code_barres_initial (≤20 car.), numero_fournisseur_unique, numero_article',
        '3) Importez le fichier via l’icône « Importer » à côté du sélecteur de modèle. Je génère automatiquement le tableau final et les « Commentaires d’import » (lignes ignorées + raisons).',
        '',
        'Limites: jusqu’à 300 lignes par import.'
      ].join('\n');
      updateAnswer({ text: intro, finalText: intro, status: 'COMPLETED' });
      updateStatus('COMPLETED');
      context?.update('answer', _ => intro);
      return intro;
    }

    const libelle_principal = safeString(payload?.libelle_principal);
    const code_barres_initial = safeString(payload?.code_barres_initial);
    const numero_fournisseur_unique = safeString(payload?.numero_fournisseur_unique);
    const numero_article = safeString(payload?.numero_article);

    // Try CSV multi-ligne d'abord
    const csvItems = parseCSVRecords(question);
    const toRow = (arr: any[]) => `| ${arr.map(v => safeString(v)).join(' | ')} |`;



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
      const { classifyCodesByEngine } = await import('./classification-codes');
      const { AA, AB, AC, AD } = await classifyCodesByEngine(normalizedLabel, signal);
      values['CSECAR'] = AA;
      values['CRAYAR'] = AB;
      values['CFAMAR'] = AC;
      values['CSFAAR'] = AD;
      const nor = safeString(item.numero_fournisseur_unique);
      if (nor) values['NORAEF'] = nor;
      return HEADERS_CODES.map(code => safeString(values[code] ?? ''));
    };

    if (csvItems && csvItems.length > 0) {
      const { valid, errors } = validateAndCollectCSV(question);
      const limited = valid.slice(0, 300);
      const rows: string[] = [];
      rows.push(toRow(HEADERS_LONG));
      rows.push(toRow(HEADERS_CODES));
      const mapWithConcurrency = async <T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>) => {
        const res = new Array<R>(items.length);
        let idx = 0;
        const workers = Array.from({ length: Math.max(1, limit) }).map(async () => {
          while (true) {
            const current = idx++;
            if (current >= items.length) break;
            res[current] = await fn(items[current], current);
          }
        });
        await Promise.all(workers);
        return res;
      };
      const dataRows = await mapWithConcurrency(limited, 4, async (it) => {
        const r = await buildRowForItem(it);
        return toRow(r);
      });
      rows.push(...dataRows);
      const commentsTitle = `\n\n## Commentaires d’import`;
      const commentsBody = errors.length
        ? errors.map(e => `- ${e}`).join('\n')
        : `- Aucune ligne ignorée`;
      const table = rows.join('\n') + commentsTitle + '\n' + commentsBody;
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

    const { classifyCodesByEngine } = await import('./classification-codes');
    const { AA, AB, AC, AD } = await classifyCodesByEngine(normalizedLabel, signal);

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
