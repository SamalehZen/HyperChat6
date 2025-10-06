import { createTask } from '@repo/orchestrator';
import { ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { generateText, handleError, sendEvents } from '../utils';
import * as XLSX from 'xlsx';
import {
  Article,
  CategoryIndex,
  buildCategoryIndex,
  chooseCategoryByKeywords,
  computeTotals,
  normalizeText,
  parseEuro,
  rebalanceWithinTolerance,
} from './_utils/ecart-tic-utils';

const safeString = (v: any) => (v === undefined || v === null ? '' : String(v));

const extractExcelFromMessages = (messages: any[]): { base64?: string; mime?: string } | null => {
  try {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      const content = m?.content;
      if (Array.isArray(content)) {
        for (const part of content) {
          if (part?.type === 'image' && typeof part?.image === 'string') {
            const dat = part.image as string;
            if (dat.startsWith('data:')) {
              const mime = dat.split(';')[0].replace('data:', '');
              if (/sheet|spreadsheet|excel|officedocument/i.test(mime)) {
                const base64 = dat.split(',')[1] || '';
                return { base64, mime };
              }
            }
          }
        }
      }
    }
  } catch {}
  return null;
};

const parseExcel = (buf: ArrayBuffer | Buffer) => {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheetNames = wb.SheetNames || [];
  const findSheet = (name: string) => sheetNames.find(n => normalizeText(n) === normalizeText(name));
  const sArticles = findSheet('Articles') || sheetNames[0];
  const sBudgets = findSheet('Budgets') || sheetNames[1];
  if (!sArticles || !sBudgets) throw new Error('Fichier invalide: deux onglets "Articles" et "Budgets" sont requis.');
  const wsA = wb.Sheets[sArticles];
  const wsB = wb.Sheets[sBudgets];
  const aoaA: any[][] = XLSX.utils.sheet_to_json(wsA, { header: 1, blankrows: false });
  const aoaB: any[][] = XLSX.utils.sheet_to_json(wsB, { header: 1, blankrows: false });
  const headerA = (aoaA[0] || []).map((h: any) => normalizeText(h));
  const headerB = (aoaB[0] || []).map((h: any) => normalizeText(h));
  const idxA = { art: headerA.indexOf('article'), tot: headerA.indexOf('total') };
  const idxB = { cat: headerB.indexOf('categorie'), bud: headerB.indexOf('budget'), kw: headerB.indexOf('motscles'), fam: headerB.indexOf('famille') };
  if (idxA.art < 0 || idxA.tot < 0) throw new Error('Colonnes requises manquantes dans "Articles" (Article, Total)');
  if (idxB.cat < 0 || idxB.bud < 0) throw new Error('Colonnes requises manquantes dans "Budgets" (Catégorie, Budget)');
  const articles = aoaA.slice(1).map(r => ({ name: safeString(r[idxA.art]).trim(), amount: parseEuro(r[idxA.tot]) }))
    .filter(r => !!r.name && isFinite(r.amount) && r.amount > 0);
  const budgetsRows = aoaB.slice(1).map(r => ({ categorie: safeString(r[idxB.cat]).trim(), budget: r[idxB.bud], motscles: idxB.kw >= 0 ? safeString(r[idxB.kw]) : '', famille: idxB.fam >= 0 ? safeString(r[idxB.fam]) : '' }))
    .filter(r => !!r.categorie && String(r.budget).trim().length > 0);
  return { articles, budgetsRows };
};

const tryParseJsonFallback = (text: string): { articles: Article[]; budgetsRows: Array<any> } | null => {
  try {
    const re = /```\s*json\s*([\s\S]*?)```/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const obj = JSON.parse(m[1]);
      const payload = obj?.ecart_tic_input || obj;
      const articles = (payload?.articles || []).map((a: any) => ({ name: safeString(a?.Article || a?.name), amount: parseEuro(a?.Total || a?.amount) }))
        .filter((r: Article) => !!r.name && isFinite(r.amount) && r.amount > 0);
      const budgetsRows = (payload?.budgets || []).map((b: any) => ({ categorie: safeString(b?.Categorie || b?.Catégorie || b?.category || b?.name), budget: b?.Budget || b?.budget, motscles: safeString(b?.MotsClés || b?.MotsCles || b?.keywords || ''), famille: safeString(b?.Famille || b?.family || '') }))
        .filter((r: any) => !!r.categorie && String(r.budget || '').trim().length > 0);
      if (articles.length && budgetsRows.length) return { articles, budgetsRows };
    }
  } catch {}
  return null;
};

export const ecartTicTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
  name: 'ecart-tic',
  execute: async ({ events, context, signal }) => {
    const { updateAnswer, updateStatus, updateStep, updateObject } = sendEvents(events);
    updateAnswer({ text: '', status: 'PENDING' });

    const messages = (context?.get('messages') || []) as any[];
    const question = safeString(context?.get('question') || '');

    // Step: Lecture du fichier
    updateStep({ stepId: 0, text: 'Lecture du fichier', stepStatus: 'PENDING', subSteps: { lecture: { status: 'PENDING' } } });
    let parsed: { articles: Article[]; budgetsRows: any[] } | null = null;

    // Try attachment first
    const attachment = extractExcelFromMessages(messages);
    if (attachment?.base64) {
      try {
        const MAX_XLSX_SIZE = 15 * 1024 * 1024;
        const estimatedBytes = Math.floor((attachment.base64.length * 3) / 4);
        if (estimatedBytes > MAX_XLSX_SIZE) {
          const err = 'Fichier trop volumineux (>15MB). Veuillez fournir un .xlsx ≤ 15MB.';
          updateAnswer({ text: err, finalText: err, status: 'COMPLETED' });
          updateStatus('COMPLETED');
          return err;
        }
        const buf = Buffer.from(attachment.base64, 'base64');
        if (buf.length > MAX_XLSX_SIZE) {
          const err = 'Fichier trop volumineux (>15MB). Veuillez fournir un .xlsx ≤ 15MB.';
          updateAnswer({ text: err, finalText: err, status: 'COMPLETED' });
          updateStatus('COMPLETED');
          return err;
        }
        const r = parseExcel(buf);
        parsed = { articles: r.articles, budgetsRows: r.budgetsRows };
      } catch (e: any) {
        // continue to fallback
      }
    }

    // Fallback: fenced JSON
    if (!parsed) {
      const fb = tryParseJsonFallback(question);
      if (fb) parsed = fb;
    }

    if (!parsed) {
      const err = 'Aucun fichier .xlsx fourni ni JSON structuré détecté. Téléchargez le modèle: /templates/ecart_tic_template.xlsx';
      updateAnswer({ text: err, finalText: err, status: 'COMPLETED' });
      updateStatus('COMPLETED');
      return err;
    }

    updateStep({ stepId: 0, text: 'Lecture du fichier', stepStatus: 'COMPLETED', subSteps: { lecture: { status: 'COMPLETED', data: { articles: parsed.articles.length, categories: parsed.budgetsRows.length } } } });

    // Step: Attribution initiale
    updateStep({ stepId: 1, text: 'Attribution initiale', stepStatus: 'PENDING', subSteps: { attribution: { status: 'PENDING' } } });
    // Build category index
    let categories: CategoryIndex;
    try {
      categories = buildCategoryIndex(parsed.budgetsRows);
    } catch (e: any) {
      const msg = `Erreur de validation des budgets: ${e?.message || e}`;
      updateAnswer({ text: msg, finalText: msg, status: 'COMPLETED' });
      updateStatus('COMPLETED');
      return msg;
    }

    // Deterministic keyword assignment first
    const assigned: Array<Article & { category?: string }> = parsed.articles.map(a => ({ ...a }));
    for (const a of assigned) {
      const best = chooseCategoryByKeywords(a.name, categories);
      if (best) a.category = best;
    }

    // Gemini fallback for ambiguous
    const needLLM: number[] = [];
    assigned.forEach((a, i) => { if (!a.category) needLLM.push(i); });
    const LLM_CAP = 200;
    const toClassify = needLLM.slice(0, LLM_CAP);

    if (toClassify.length) {
      const apiKeyMissing = !process.env.GEMINI_API_KEY && !(self as any).AI_API_KEYS?.google;
      if (apiKeyMissing) {
        updateAnswer({ text: '\n⚠️ GEMINI_API_KEY manquant — attribution uniquement par mots‑clés.\n', status: 'PENDING' });
      } else {
        const catList = Object.keys(categories).map(k => {
          const c = categories[k];
          return `${c.name}${c.keywords.length ? ` (mots-clés: ${c.keywords.join(', ')})` : ''}`;
        }).join('\n');
        const prompt = `Tu es un classificateur déterministe. On te fournit une liste d'articles et une liste de catégories.
Règles:
- Retourne UNIQUEMENT un JSON avec un tableau "result" de la même longueur que la liste fournie d'articles.
- Chaque entrée est le NOM EXACT d'une catégorie parmi la liste fournie ci‑dessous.
- Si aucun indice évident, choisis la catégorie la plus plausible en te basant sur les mots‑clés fournis.

Catégories:
${catList}
`;
        const batchSize = 30;
        for (let i = 0; i < toClassify.length; i += batchSize) {
          const batchIdx = toClassify.slice(i, i + batchSize);
          const items = batchIdx.map(ii => assigned[ii].name);
          try {
            const resp = await generateText({
              prompt,
              model: ModelEnum.GEMINI_2_5_FLASH,
              messages: [{ role: 'user', content: `Articles:\n${items.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}\n\nRéponds avec: {"result":["Cat1","Cat2",...]}` } as any],
              signal,
            });
            const jsonStr = (() => {
              try {
                const first = resp.indexOf('{');
                const last = resp.lastIndexOf('}');
                if (first !== -1 && last !== -1 && last > first) return resp.slice(first, last + 1);
              } catch {}
              return '';
            })();
            const obj = JSON.parse(jsonStr);
            const result = Array.isArray(obj?.result) ? obj.result : [];
            result.forEach((catName: string, localIdx: number) => {
              const ii = batchIdx[localIdx];
              const key = normalizeText(catName);
              if (categories[key]) assigned[ii].category = key;
            });
          } catch {}
        }
      }
    }

    // Fallback heuristic for any remaining
    for (const a of assigned) {
      if (!a.category) {
        // Assign to category with largest budget (coarse prior)
        const best = Object.keys(categories).sort((x, y) => categories[y].budget - categories[x].budget)[0];
        a.category = best;
      }
    }

    updateStep({ stepId: 1, text: 'Attribution initiale', stepStatus: 'COMPLETED', subSteps: { attribution: { status: 'COMPLETED' } } });

    // Step: Calcul des écarts
    updateStep({ stepId: 2, text: 'Calcul des écarts', stepStatus: 'PENDING', subSteps: { ecarts: { status: 'PENDING' } } });
    let { totals, gap } = computeTotals(assigned, categories);
    updateStep({ stepId: 2, text: 'Calcul des écarts', stepStatus: 'COMPLETED', subSteps: { ecarts: { status: 'COMPLETED', data: { categories: Object.keys(categories).length } } } });

    // Step: Réallocation
    updateStep({ stepId: 3, text: 'Réallocation', stepStatus: 'PENDING', subSteps: { reallocation: { status: 'PENDING' } } });
    const { allocation, journal } = rebalanceWithinTolerance(assigned, categories, 10000);
    totals = allocation.totals;
    gap = allocation.gap;

    // Global adjustment if mismatch
    const sumBudget = Object.keys(categories).reduce((s, k) => s + categories[k].budget, 0);
    const sumTotals = assigned.reduce((s, a) => s + a.amount, 0);
    const globalDiff = sumBudget - sumTotals;
    let adjustedBudgets: Record<string, number> | null = null;
    if (Math.abs(globalDiff) > 10) {
      adjustedBudgets = {};
      const underKeys = Object.keys(categories).filter(k => allocation.gap[k] > 0);
      const pool = underKeys.length ? underKeys : Object.keys(categories);
      const base = pool.map(k => Math.max(1, allocation.gap[k] > 0 ? allocation.gap[k] : categories[k].budget));
      const baseSum = base.reduce((a, b) => a + b, 0) || 1;
      pool.forEach((k, idx) => {
        const delta = (globalDiff * (base[idx] / baseSum));
        adjustedBudgets![k] = categories[k].budget - delta; // reduce if diff positive, increase if negative
      });
    }

    updateStep({ stepId: 3, text: 'Réallocation', stepStatus: 'COMPLETED', subSteps: { reallocation: { status: 'COMPLETED', data: { moves: journal.length } } } });

    // Step: Génération du fichier final
    updateStep({ stepId: 4, text: 'Génération du fichier final', stepStatus: 'PENDING', subSteps: { generation: { status: 'PENDING' } } });

    // Build outputs
    const catKeys = Object.keys(categories);
    const usedBudget = (k: string) => adjustedBudgets?.[k] ?? categories[k].budget;
    const statusOf = (k: string) => {
      const ecart = (usedBudget(k) - (totals[k] || 0));
      return Math.abs(ecart) <= 10 ? '✅ Équilibré' : 'Ajusté';
    };

    const detailHeader = ['Article', 'Total (€)', 'Catégorie finale', 'Budget Catégorie (€)', 'Écart (€)', 'Statut'];
    const detailRows = allocation.articles.map(a => {
      const k = a.category!;
      const b = usedBudget(k);
      const e = b - (totals[k] || 0);
      return [a.name, a.amount, categories[k].name, Math.round(b * 100) / 100, Math.round(e * 100) / 100, statusOf(k)];
    });

    const bilanHeader = ['Catégorie', 'Budget initial (€)', 'Budget ajusté (€)', 'Total alloué (€)', 'Écart (€)', 'Statut'];
    const bilanRows = catKeys.map(k => {
      const init = categories[k].budget;
      const adj = adjustedBudgets?.[k] ?? '';
      const tot = totals[k] || 0;
      const e = (adjustedBudgets ? (adjustedBudgets[k] ?? init) : init) - tot;
      return [categories[k].name, Math.round(init * 100) / 100, typeof adj === 'number' ? Math.round(adj * 100) / 100 : '', Math.round(tot * 100) / 100, Math.round(e * 100) / 100, statusOf(k)];
    });

    const journalHeader = ['Article', 'Montant', 'De', 'Vers', 'Raison', 'Étape'];
    const journalRows = journal.map(j => [j.article, j.amount, categories[j.from].name, categories[j.to].name, j.reason, j.step]);

    const resumeHeader = ['Indicateur', 'Valeur'];
    const finalBudgetTotal = catKeys.reduce((sum, k) => sum + (adjustedBudgets?.[k] ?? categories[k].budget), 0);
    const finalGlobalDiff = finalBudgetTotal - sumTotals;
    const categoriesBalanced = bilanRows.filter(r => r[5] === '✅ Équilibré').length;
    const resumeRows = [
      ['Total Budgets', Math.round(finalBudgetTotal * 100) / 100],
      ['Total Alloué', Math.round(sumTotals * 100) / 100],
      ['Écart Global', Math.round((finalGlobalDiff) * 100) / 100],
      ['Catégories équilibrées', `${categoriesBalanced}/${catKeys.length}`],
      ['Catégories ajustées', `${catKeys.length - categoriesBalanced}`],
      ['Articles réalloués', `${journal.length}`],
      ['Situation finale', categoriesBalanced === catKeys.length ? '✅ Toutes dans ±10 €' : 'Ajustements requis'],
    ];

    // Stream preview
    const previewRows = [detailHeader, ...detailRows.slice(0, 50)];
    const toMd = (rows: any[][]) => {
      if (!rows.length) return '';
      const header = rows[0];
      const sep = header.map(() => '---');
      const body = rows.slice(1);
      const fmt = (v: any) => (v === null || v === undefined ? '' : String(v));
      return ['| ' + header.map(fmt).join(' | ') + ' |', '| ' + sep.join(' | ') + ' |', ...body.map(r => '| ' + r.map(fmt).join(' | ') + ' |')].join('\n');
    };

    updateAnswer({ text: `\n### Aperçu — Détail Articles (50 premières lignes)\n\n${toMd(previewRows)}\n\n### Résumé global\n\n${toMd([resumeHeader, ...resumeRows])}\n`, status: 'PENDING' });

    // Build workbook for download
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([detailHeader, ...detailRows]);
    const ws2 = XLSX.utils.aoa_to_sheet([bilanHeader, ...bilanRows]);
    const ws3 = XLSX.utils.aoa_to_sheet([journalHeader, ...journalRows]);
    const ws4 = XLSX.utils.aoa_to_sheet([resumeHeader, ...resumeRows]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Détail Articles');
    XLSX.utils.book_append_sheet(wb, ws2, 'Bilan Catégories');
    XLSX.utils.book_append_sheet(wb, ws3, 'Journal des réallocations');
    XLSX.utils.book_append_sheet(wb, ws4, 'Résumé global');
    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;

    updateStep({ stepId: 4, text: 'Génération du fichier final', stepStatus: 'COMPLETED', subSteps: { generation: { status: 'COMPLETED' } } });

    // Step: Résumé
    updateStep({ stepId: 5, text: 'Résumé', stepStatus: 'PENDING', subSteps: { resume: { status: 'PENDING' } } });

    // Send structured object for potential UI
    updateObject({ summary: { totalBudget: finalBudgetTotal, totalAllocated: sumTotals, categories: catKeys.length, balanced: categoriesBalanced, reallocated: journal.length } });

    const finalText = [
      'Le traitement est terminé. Vous pouvez télécharger le fichier Excel final ci‑dessous.',
      '',
      `<a href="${dataUrl}" download="ecart-tic.xlsx">⬇️ Télécharger l’XLSX (4 onglets)</a>`,
    ].join('\n');

    updateAnswer({ text: '', finalText, status: 'COMPLETED' });
    updateStatus('COMPLETED');
    context?.update('answer', _ => finalText);
    context?.get('onFinish')?.({
      answer: finalText,
      threadId: context?.get('threadId'),
      threadItemId: context?.get('threadItemId'),
      mode: 'ecart-tic',
      stats: { items: assigned.length, categories: Object.keys(categories).length, moves: journal.length },
    });

    return finalText;
  },
  onError: handleError,
  route: ({ context }) => {
    if (context?.get('showSuggestions') && context.get('answer')) {
      return 'suggestions';
    }
    return 'end';
  },
});
