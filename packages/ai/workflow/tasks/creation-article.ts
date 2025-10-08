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
const formatDecimalSeparator = (value: any) => {
  const str = safeString(value);
  return /^-?\d+\.\d+$/.test(str) ? str.replace('.', ',') : str;
};
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

type HeaderVariant = 'new' | 'old';

type ClassificationCodes = { AA: string; AB: string; AC: string; AD: string };
type ClassificationPreviewItem = {
  index: number;
  libelle: string;
  aa: { code: string; libelle: string };
  ab: { code: string; libelle: string };
  ac: { code: string; libelle: string };
  ad: { code: string; libelle: string };
};

const detectHeaderVariant = (header: string[]): HeaderVariant | null => {
  if (!header || header.length < 3) return null;
  const baseMatch =
    header[0] === 'libelle_principal' &&
    header[1] === 'code_barres_initial' &&
    header[2] === 'numero_fournisseur_unique';
  if (!baseMatch) return null;
  const trimmed = [...header];
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') trimmed.pop();
  if (trimmed.length >= 4 && trimmed[3] === 'numero_article') return 'old';
  if (trimmed.length === 3) return 'new';
  return null;
};

const parseCSVRecords = (text: string) => {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const headerIndex = lines.findIndex(l => /^libelle_principal\s*,/i.test(l));
  if (headerIndex === -1) return [] as Array<{ libelle_principal: string; code_barres_initial: string; numero_fournisseur_unique: string; numero_article: string }>;
  const headerTokens = parseCSVLine(lines[headerIndex]).map(h => h.toLowerCase());
  while (headerTokens.length > 0 && headerTokens[headerTokens.length - 1] === '') headerTokens.pop();
  const variant = detectHeaderVariant(headerTokens);
  if (!variant) return [] as Array<{ libelle_principal: string; code_barres_initial: string; numero_fournisseur_unique: string; numero_article: string }>;
  const idx = {
    lib: headerTokens.indexOf('libelle_principal'),
    ean: headerTokens.indexOf('code_barres_initial'),
    nor: headerTokens.indexOf('numero_fournisseur_unique'),
    art: variant === 'old' ? headerTokens.indexOf('numero_article') : -1,
  };
  if (idx.lib < 0 || idx.ean < 0 || idx.nor < 0) return [] as any[];
  const records: Array<{ libelle_principal: string; code_barres_initial: string; numero_fournisseur_unique: string; numero_article: string }> = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (!row.length) continue;
    const lib = row[idx.lib] || '';
    const ean = row[idx.ean] || '';
    const nor = row[idx.nor] || '';
    const art = idx.art >= 0 ? row[idx.art] || '' : '';
    if (lib && ean && nor) {
      records.push({ libelle_principal: lib, code_barres_initial: ean, numero_fournisseur_unique: nor, numero_article: art });
    }
  }
  return records;
};

const validateAndCollectCSV = (text: string) => {
  const lines = text.split(/\r?\n/).map((s) => s.trim());
  const nonEmpty = lines.map((l, idx) => ({ line: l, idx })).filter((x) => x.line.length > 0);
  const headerIdxObj = nonEmpty.find((x) => {
    const header = parseCSVLine(x.line).map((h) => h.toLowerCase());
    while (header.length > 0 && header[header.length - 1] === '') header.pop();
    return !!detectHeaderVariant(header);
  });
  if (!headerIdxObj) return { valid: [] as Array<{ libelle_principal: string; code_barres_initial: string; numero_fournisseur_unique: string; numero_article: string }>, errors: [] as string[] };
  const headerArr = parseCSVLine(headerIdxObj.line).map((h) => h.toLowerCase());
  while (headerArr.length > 0 && headerArr[headerArr.length - 1] === '') headerArr.pop();
  const variant = detectHeaderVariant(headerArr);
  if (!variant) return { valid: [] as Array<{ libelle_principal: string; code_barres_initial: string; numero_fournisseur_unique: string; numero_article: string }>, errors: [] as string[] };
  const idx = {
    lib: headerArr.indexOf('libelle_principal'),
    ean: headerArr.indexOf('code_barres_initial'),
    nor: headerArr.indexOf('numero_fournisseur_unique'),
    art: variant === 'old' ? headerArr.indexOf('numero_article') : -1,
  };
  if (idx.lib < 0 || idx.ean < 0 || idx.nor < 0) {
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
    const art = idx.art >= 0 ? safeString(row[idx.art]).trim() : '';
    const rowErrors: string[] = [];
    if (!lib) rowErrors.push('champ manquant libelle_principal');
    if (!ean) rowErrors.push('champ manquant code_barres_initial');
    if (!nor) rowErrors.push('champ manquant numero_fournisseur_unique');
    if (ean && ean.length > 20) rowErrors.push('longueur code_barres_initial > 20');
    if (rowErrors.length > 0) {
      const logicalLine = i - headerIdxObj.idx;
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
    const REQUIRED_FIELDS: FieldKey[] = ['libelle_principal','code_barres_initial','numero_fournisseur_unique'];

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

    function getPendingFromAssistant(msgs: any[]) {
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (m?.role === 'assistant') {
          const t = safeString(m?.content || '');
          const idx = t.lastIndexOf('CREATION-ARTICLE:PENDING=');
          if (idx >= 0) {
            const after = t.slice(idx + 'CREATION-ARTICLE:PENDING='.length).trim();
            try {
              const obj = JSON.parse(after);
              return obj as any;
            } catch {}
          }
        }
      }
      return null;
    }

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

    const csvValidation = validateAndCollectCSV(question);
    const hasCsv = csvValidation.valid.length > 0;
    const nextMissing = REQUIRED_FIELDS.find((f): f is FieldKey => !safeString((payload as any)[f]));

    const pendingRecordsRaw = context?.get('creationArticlePendingRecords') as string | null | undefined;
    const pendingClassificationsRaw = context?.get('creationArticlePendingClassifications') as string | null | undefined;
    const pendingErrorsRaw = context?.get('creationArticlePendingErrors') as string | null | undefined;
    const latestUser = [...(messages || [])].reverse().find(m => m?.role === 'user');
    const latestText = safeString(latestUser?.content || question || '');
    const normalizedQuestion = latestText.toLowerCase();
    const wantsApproval = /\boui\b/.test(normalizedQuestion);
    const looksLikeNewCsv = hasCsv || normalizedQuestion.includes('libelle_principal');
    const hasPendingPreview = !!pendingRecordsRaw && !!pendingClassificationsRaw;
    if (hasPendingPreview || wantsApproval) {
      if (wantsApproval) {
        try {
          let records: Array<{ libelle_principal: string; code_barres_initial: string; numero_fournisseur_unique: string; numero_article: string }> | null = null;
          let classifications: ClassificationPreviewItem[] | null = null;
          let errors: string[] = [];
          if (pendingRecordsRaw && pendingClassificationsRaw) {
            records = JSON.parse(pendingRecordsRaw as string);
            classifications = JSON.parse(pendingClassificationsRaw as string);
            errors = pendingErrorsRaw ? JSON.parse(pendingErrorsRaw as string) as string[] : [];
          } else {
            const pend = getPendingFromAssistant(messages) as any;
            if (pend) {
              records = pend.records || null;
              classifications = pend.classifications || null;
              errors = Array.isArray(pend.errors) ? pend.errors : [];
            }
          }
          if (!records || !classifications) throw new Error('NO_PENDING_DATA');
          context?.update('creationArticlePendingRecords', () => null);
          context?.update('creationArticlePendingClassifications', () => null);
          context?.update('creationArticlePendingErrors', () => null);
          const table = await createFinalOutput(records, errors, classifications);
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
        } catch {
          context?.update('creationArticlePendingRecords', () => null);
          context?.update('creationArticlePendingClassifications', () => null);
          context?.update('creationArticlePendingErrors', () => null);
          const message = 'La pré-classification précédente n’est plus disponible. Merci de réimporter le fichier.';
          updateAnswer({ text: message, finalText: message, status: 'COMPLETED' });
          updateStatus('COMPLETED');
          context?.update('answer', _ => message);
          return message;
        }
      } else if (!looksLikeNewCsv && hasPendingPreview) {
        const reminder = 'Merci de répondre "oui" pour valider ces classifications, ou réimportez un fichier pour recommencer.';
        updateAnswer({ text: reminder, finalText: reminder, status: 'COMPLETED' });
        updateStatus('COMPLETED');
        context?.update('answer', _ => reminder);
        return reminder;
      } else {
        context?.update('creationArticlePendingRecords', () => null);
        context?.update('creationArticlePendingClassifications', () => null);
        context?.update('creationArticlePendingErrors', () => null);
      }
    }

    if (!hasCsv && nextMissing) {
      const isDomainQuestion = /\?|\b(comment|combien|peux|puis-je|est-ce|pourquoi|quel(?:le|s)?|format|mod[èe]le|template|csv|xlsx|ean|colonn|ligne|ignor|limite|valid|doubl|num[ée]riq|import|export|résultat|tableau)\b/i.test(question);
      if (isDomainQuestion) {
        try {
          const system = `Tu es un assistant spécialisé pour la création d’article (cyrusEREF). Réponds uniquement aux questions liées à:\n- modèles CSV/XLSX et étapes d’import\n- colonnes requises (libelle_principal, code_barres_initial ≤ 20, numero_fournisseur_unique) et colonne optionnelle numero_article pour les anciens fichiers\n- limites (max 300 lignes)\n- validation et commentaires d’import (lignes ignorées et raisons)\n- formatage/conseils pour obtenir le tableau final.\nNe réponds pas à des sujets hors de ce périmètre. Sois clair, concis et pratique.`;
          const answer = await generateText({
            prompt: system,
            model: ModelEnum.GEMINI_2_5_FLASH,
            messages: [{ role: 'user', content: question }] as any,
            signal,
          });
          const text = safeString(answer || '').trim() || 'Je peux aider uniquement sur l’import CSV/XLSX de création d’article. Téléchargez le modèle (CSV/XLSX), remplissez les colonnes obligatoires (libelle_principal, code_barres_initial ≤ 20, numero_fournisseur_unique), puis importez pour obtenir le tableau. La colonne numero_article reste optionnelle.';
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
        '2) Remplissez les colonnes obligatoires: libelle_principal, code_barres_initial (≤20 car.), numero_fournisseur_unique. La colonne numero_article reste acceptée pour les anciens modèles.',
        '3) Importez le fichier via l’icône « Importer » à côté du sélecteur de modèle. Je génère automatiquement le tableau final et les « Commentaires d’import » (lignes ignorées + raisons) et je gère aussi l’ancien modèle à 4 colonnes si besoin.',
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

    // Try CSV multi-ligne d'abord
    function toRow(arr: any[]) { return `| ${arr.map(v => formatDecimalSeparator(v)).join(' | ')} |`; }

    async function classify(labelForClassification: string) {
      let AA: string = FallbackCodes.AA;
      let AB: string = FallbackCodes.AB;
      let AC: string = FallbackCodes.AC;
      let AD: string = FallbackCodes.AD;
      const labelToSend = safeString(labelForClassification).trim();
      try {
        const clsResponse = await generateText({
          prompt: GEMINI_SPECIALIZED_PROMPT + '\n\nRéponds uniquement avec un JSON compact contenant les 4 codes de classification pour ce libellé: {"AA":"..","AB":"..","AC":"..","AD":".."}. Aucune explication.',
          model: ModelEnum.GEMINI_2_5_FLASH,
          messages: [{ role: 'user', content: `Libellé: ${labelToSend}` }] as any,
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

    async function buildRowForItem(item: { libelle_principal: string; code_barres_initial: string; numero_fournisseur_unique: string; numero_article: string }, preclassified?: ClassificationCodes) {
      const values: Record<string, string> = {};
      for (let i = 0; i < HEADERS_CODES.length; i++) {
        const code = HEADERS_CODES[i];
        if (COPY_FROM_REF_CODES.has(code)) {
          const refVal = formatDecimalSeparator((REF_ROW as any)[i] ?? '');
          if (refVal) values[code] = refVal;
        }
      }
      const originalLabel = safeString(item.libelle_principal);
      const normalizedLabel = collapseSpaces(stripAccents(originalLabel.toUpperCase()));
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
      values['NARTAR'] = '';
      values['NAS1AS'] = '201';
      const nor = safeString(item.numero_fournisseur_unique);
      values['NFOUEF'] = nor;
      values['NORAEF'] = '';
      if (!values['CEANAR']) values['GENECB'] = '1'; else values['GENECB'] = '';
      let codes = preclassified;
      if (!codes || !codes.AA || !codes.AB || !codes.AC || !codes.AD) {
        codes = await classify(originalLabel || normalizedLabel);
      }
      values['CSECAR'] = safeString(codes?.AA || '');
      values['CRAYAR'] = safeString(codes?.AB || '');
      values['CFAMAR'] = safeString(codes?.AC || '');
      values['CSFAAR'] = safeString(codes?.AD || '');
      return HEADERS_CODES.map(code => formatDecimalSeparator(values[code] ?? ''));
    };

    const renderClassificationPreviewTable = (classifications: ClassificationPreviewItem[]) => {
      const header = '| Libellé | Code secteur | Nom secteur | Code rayon | Nom rayon | Code famille | Nom famille | Code sous-famille | Nom sous-famille |';
      const separator = '|---|---|---|---|---|---|---|---|---|';
      const rows = classifications
        .sort((a, b) => a.index - b.index)
        .map((item) => {
          const safeLibelle = safeString(item.libelle).replace(/\|/g, '\\|');
          return `| ${safeLibelle} | ${safeString(item.aa?.code || '')} | ${safeString(item.aa?.libelle || '')} | ${safeString(item.ab?.code || '')} | ${safeString(item.ab?.libelle || '')} | ${safeString(item.ac?.code || '')} | ${safeString(item.ac?.libelle || '')} | ${safeString(item.ad?.code || '')} | ${safeString(item.ad?.libelle || '')} |`;
        });
      return [header, separator, ...rows].join('\n');
    };

    function classificationsToCodes(classifications?: ClassificationPreviewItem[] | null): ClassificationCodes[] {
      if (!classifications) return [];
      const sorted = [...classifications].sort((a, b) => a.index - b.index);
      return sorted.map((item) => ({
        AA: safeString(item.aa?.code || ''),
        AB: safeString(item.ab?.code || ''),
        AC: safeString(item.ac?.code || ''),
        AD: safeString(item.ad?.code || ''),
      }));
    };

    const classifyBatchForPreview = async (records: Array<{ libelle_principal: string }>) => {
      if (!records.length) return [] as ClassificationPreviewItem[];
      const payload = records.map((item, index) => ({ index: index + 1, libelle: safeString(item.libelle_principal) }));
      const instruction = [
        'Analyse les articles suivants pour le format cyrusEREF.',
        'Retourne un JSON strict de la forme {"items":[{"index":1,"libelle":"...","aa":{"code":"..","libelle":".."},"ab":{...},"ac":{...},"ad":{...}}]} pour tous les articles.',
        'Chaque libellé doit être traité de manière indépendante et cohérente avec la hiérarchie officielle.',
        'Articles:',
        JSON.stringify(payload),
        'Réponds uniquement avec le JSON demandé, sans texte additionnel.'
      ].join('\n');

      const response = await generateText({
        prompt: GEMINI_SPECIALIZED_PROMPT,
        model: ModelEnum.GEMINI_2_5_FLASH,
        messages: [{ role: 'user', content: instruction }] as any,
        signal,
      });

      const parsed = extractJson(response) ?? (() => {
        try {
          return JSON.parse(response);
        } catch {
          return null;
        }
      })();
      if (!parsed || !Array.isArray(parsed.items)) {
        throw new Error('CLASSIFICATION_PREVIEW_PARSE_ERROR');
      }
      const items = (parsed.items as any[]).map((entry) => ({
        index: Number(entry?.index ?? 0),
        libelle: safeString(entry?.libelle || ''),
        aa: { code: safeString(entry?.aa?.code || ''), libelle: safeString(entry?.aa?.libelle || '') },
        ab: { code: safeString(entry?.ab?.code || ''), libelle: safeString(entry?.ab?.libelle || '') },
        ac: { code: safeString(entry?.ac?.code || ''), libelle: safeString(entry?.ac?.libelle || '') },
        ad: { code: safeString(entry?.ad?.code || ''), libelle: safeString(entry?.ad?.libelle || '') },
      })) as ClassificationPreviewItem[];
      return items.sort((a, b) => a.index - b.index);
    };

    async function createFinalOutput(
      records: Array<{ libelle_principal: string; code_barres_initial: string; numero_fournisseur_unique: string; numero_article: string }>,
      errors: string[],
      preclassifiedItems?: ClassificationPreviewItem[] | null,
    ) {
      const codesList = classificationsToCodes(preclassifiedItems);
      const rows: string[] = [];
      rows.push(toRow(HEADERS_LONG));
      rows.push(toRow(HEADERS_CODES));
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const preCodes = codesList[i];
        const row = await buildRowForItem(record, preCodes);
        rows.push(toRow(row));
      }
      const commentsTitle = `\n\n## Commentaires d’import`;
      const commentsBody = errors.length
        ? errors.map((e) => `- ${e}`).join('\n')
        : `- Aucune ligne ignorée`;
      return rows.join('\n') + commentsTitle + '\n' + commentsBody;
    };

    if (hasCsv) {
      const limited = csvValidation.valid.slice(0, 300);
      const errors = csvValidation.errors;
      if (!limited.length) {
        const table = await createFinalOutput(limited, errors, null);
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
      try {
        const previewClassifications = await classifyBatchForPreview(limited);
        context?.update('creationArticlePendingRecords', () => JSON.stringify(limited));
        context?.update('creationArticlePendingClassifications', () => JSON.stringify(previewClassifications));
        context?.update('creationArticlePendingErrors', () => JSON.stringify(errors));
        const previewTable = renderClassificationPreviewTable(previewClassifications);
        const pendingPayload = { records: limited, classifications: previewClassifications, errors };
        const responseText = `${previewTable}\n\nRéponds "oui" pour valider ces classifications.`;
        updateAnswer({ text: responseText, finalText: responseText, status: 'COMPLETED' });
        updateStatus('COMPLETED');
        context?.update('answer', _ => responseText);
        return responseText;
      } catch (error) {
        const message = 'Impossible de générer la pré-classification. Merci de réessayer.';
        updateAnswer({ text: message, finalText: message, status: 'COMPLETED' });
        updateStatus('COMPLETED');
        context?.update('answer', _ => message);
        return message;
      }
    }

    // Mono-article (comportement existant)
    const originalLabel = libelle_principal;
    const normalizedLabel = collapseSpaces(stripAccents(originalLabel.toUpperCase()));

    const values: Record<string, string> = {};

    for (let i = 0; i < HEADERS_CODES.length; i++) {
      const code = HEADERS_CODES[i];
      if (COPY_FROM_REF_CODES.has(code)) {
        const refVal = formatDecimalSeparator((REF_ROW as any)[i] ?? '');
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

    values['NARTAR'] = '';
    values['NAS1AS'] = '201';
    values['NFOUEF'] = numero_fournisseur_unique;
    values['NORAEF'] = '';

    if (!values['CEANAR']) {
      values['GENECB'] = '1';
    } else {
      values['GENECB'] = '';
    }

    const { AA, AB, AC, AD } = await classify(originalLabel || normalizedLabel);

    values['CSECAR'] = AA;
    values['CRAYAR'] = AB;
    values['CFAMAR'] = AC;
    values['CSFAAR'] = AD;

    const valuesRow = HEADERS_CODES.map(code => formatDecimalSeparator(values[code] ?? ''));

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
