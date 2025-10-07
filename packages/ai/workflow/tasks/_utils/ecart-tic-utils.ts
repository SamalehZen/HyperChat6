export type Article = { name: string; amount: number };
export type Category = { name: string; budget: number; keywords: string[]; family?: string };
export type CategoryIndex = Record<string, Category & { key: string }>;

export const stripAccents = (s: string) =>
  (s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');

export const normalizeText = (s: string) =>
  stripAccents(String(s || '').toLowerCase()).replace(/\s+/g, ' ').trim();

export const parseEuro = (v: any): number => {
  if (v === null || v === undefined) return NaN;
  if (typeof v === 'number') return v;
  let s = String(v).trim();
  if (!s) return NaN;
  // Remove thousands separators: dot or space or thin space
  s = s.replace(/[\s\u00A0\u202F\.](?=\d{3}(\D|$))/g, '');
  // Replace comma decimal by dot
  s = s.replace(/,(\d{1,2})$/, '.$1');
  // Handle cases like 1,234.56 (US) already fine
  const num = Number(s.replace(/[^0-9.-]/g, ''));
  return isFinite(num) ? num : NaN;
};

export const buildCategoryIndex = (rows: Array<{
  categorie: string; budget: any; motscles?: string; famille?: string;
}>) => {
  const index: CategoryIndex = {};
  for (const r of rows) {
    const rawName = String(r.categorie || '').trim();
    const key = normalizeText(rawName);
    if (!key) throw new Error('Catégorie manquante');
    if (index[key]) throw new Error(`Catégorie en double: ${rawName}`);
    const budget = parseEuro(r.budget);
    if (!isFinite(budget) || budget < 0) throw new Error(`Budget invalide pour ${rawName}`);
    const kw = (r.motscles || '')
      .split(',')
      .map(s => normalizeText(s))
      .filter(Boolean);
    const family = normalizeText(r.famille || '');
    index[key] = {
      key,
      name: rawName,
      budget,
      keywords: kw,
      family: family || undefined,
    };
  }
  return index;
};

export const keywordScore = (text: string, kw: string): number => {
  if (!text || !kw) return 0;
  // whole word or substring scoring: longer keywords score more
  const idx = text.indexOf(kw);
  if (idx === -1) return 0;
  const multiplier = kw.length >= 6 ? 2 : 1;
  // Frequency boost
  const freq = Math.max(1, (text.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length);
  return kw.length * multiplier + freq - 1;
};

export const chooseCategoryByKeywords = (article: string, index: CategoryIndex): string | null => {
  const text = normalizeText(article);
  let bestKey: string | null = null;
  let bestScore = 0;
  for (const key of Object.keys(index)) {
    const cat = index[key];
    if (!cat.keywords?.length) continue;
    let score = 0;
    for (const kw of cat.keywords) {
      score += keywordScore(text, kw);
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestKey;
};

export type Allocation = {
  articles: Array<Article & { category?: string }>;
  categories: CategoryIndex;
  totals: Record<string, number>;
  gap: Record<string, number>;
};

export const computeTotals = (articles: Array<Article & { category?: string }>, categories: CategoryIndex) => {
  const totals: Record<string, number> = {};
  const gap: Record<string, number> = {};
  for (const key of Object.keys(categories)) {
    totals[key] = 0;
  }
  for (const a of articles) {
    if (!a.category) continue;
    if (!(a.category in totals)) totals[a.category] = 0;
    totals[a.category] += a.amount;
  }
  for (const key of Object.keys(categories)) {
    gap[key] = categories[key].budget - (totals[key] || 0);
  }
  return { totals, gap };
};

export const pickBestDestination = (
  itemAmount: number,
  fromKey: string,
  categories: CategoryIndex,
  totals: Record<string, number>,
  gap: Record<string, number>,
  tolerance: number = 10
): string | null => {
  const fromFamily = categories[fromKey]?.family;
  const underBudgetKeys = Object.keys(categories).filter(k => gap[k] > tolerance);
  if (underBudgetKeys.length === 0) return null;
  // Prefer same family
  const sameFamily = underBudgetKeys.filter(k => !!fromFamily && categories[k].family === fromFamily);
  const pool = sameFamily.length ? sameFamily : underBudgetKeys;
  let best: string | null = null;
  let bestMetric = Number.POSITIVE_INFINITY;
  for (const destKey of pool) {
    const destBudget = categories[destKey].budget;
    const destTotal = totals[destKey] || 0;
    const postMoveTotal = destTotal + itemAmount;
    const postGap = destBudget - postMoveTotal; // positive means still under-budget
    if (postGap < -tolerance) continue; // would exceed tolerance on destination
    const metric = Math.abs(postGap); // minimize absolute deviation
    if (metric < bestMetric) {
      bestMetric = metric;
      best = destKey;
    }
  }
  return best;
};

export const reallocateOnce = (
  alloc: Allocation,
  tolerance: number = 10
): { moved: boolean; from?: string; to?: string; index?: number } => {
  const { articles, categories } = alloc;
  // Recompute each iteration
  const { totals, gap } = computeTotals(articles, categories);
  alloc.totals = totals;
  alloc.gap = gap;
  const overBudget = Object.keys(categories).filter(k => gap[k] < -tolerance);
  const underBudget = Object.keys(categories).filter(k => gap[k] > tolerance);
  if (!overBudget.length || !underBudget.length) return { moved: false };

  // Choose the most over-budget category
  overBudget.sort((a, b) => gap[a] - gap[b]); // most negative first
  for (const fromKey of overBudget) {
    // Pick largest item in this category
    const indices = articles
      .map((a, i) => ({ i, a }))
      .filter(x => x.a.category === fromKey)
      .sort((x, y) => y.a.amount - x.a.amount);
    for (const { i, a } of indices) {
      const toKey = pickBestDestination(a.amount, fromKey, categories, totals, gap, tolerance);
      if (!toKey) continue;
      // Move item
      articles[i] = { ...a, category: toKey };
      return { moved: true, from: fromKey, to: toKey, index: i };
    }
  }
  return { moved: false };
};

export const rebalanceWithinTolerance = (
  articles: Array<Article & { category?: string }>,
  categories: CategoryIndex,
  maxIterations = 5000,
  tolerance: number = 10
) => {
  const alloc: Allocation = { articles, categories, totals: {}, gap: {} };
  const journal: Array<{ article: string; amount: number; from: string; to: string; reason: string; step: number }> = [];
  let moved = true;
  let step = 0;
  while (moved && step < maxIterations) {
    step++;
    const res = reallocateOnce(alloc, tolerance);
    moved = !!res.moved;
    if (moved && res.index !== undefined && res.from && res.to) {
      const it = articles[res.index];
      journal.push({ article: it.name, amount: it.amount, from: res.from, to: res.to, reason: categories[res.to].family && categories[res.from].family && categories[res.to].family === categories[res.from].family ? 'Compatibilité famille' : 'Réduction écart', step });
    }
  }
  const final = computeTotals(articles, categories);
  alloc.totals = final.totals;
  alloc.gap = final.gap;
  return { allocation: alloc, journal };
};
