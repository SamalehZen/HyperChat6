import { describe, it, expect } from 'bun:test';
import { normalizeText, parseEuro, buildCategoryIndex, chooseCategoryByKeywords, reallocateOnce, rebalanceWithinTolerance } from './ecart-tic-utils';

describe('normalizeText', () => {
  it('removes accents and normalizes spaces', () => {
    expect(normalizeText('  Élévâtèür  ')).toBe('elevateur');
    expect(normalizeText('Café crème')).toBe('cafe creme');
  });
});

describe('parseEuro', () => {
  it('parses FR formats', () => {
    expect(parseEuro('1\u00A0234,56')).toBeCloseTo(1234.56, 2);
    expect(parseEuro('2 000')).toBeCloseTo(2000, 2);
  });
  it('parses EN formats', () => {
    expect(parseEuro('1,234.50')).toBeCloseTo(1234.5, 2);
  });
});

describe('keyword matching', () => {
  const idx = buildCategoryIndex([
    { categorie: 'Boissons', budget: '1000', motscles: 'cafe, the, soda', famille: 'Frais' },
    { categorie: 'Snacks', budget: '1000', motscles: 'chips, biscuit', famille: 'Frais' },
  ]);
  it('matches by longest and frequency', () => {
    const cat = chooseCategoryByKeywords('Café arabica – le the vert', idx);
    expect(['boissons']).toContain(cat);
  });
});

describe('reallocation loop', () => {
  it('moves largest items to best under-budget destination with family preference', () => {
    const idx = buildCategoryIndex([
      { categorie: 'Cat A', budget: '100', motscles: '', famille: 'fam1' },
      { categorie: 'Cat B', budget: '200', motscles: '', famille: 'fam1' },
      { categorie: 'Cat C', budget: '300', motscles: '', famille: 'fam2' },
    ]);
    const articles = [
      { name: 'X1', amount: 180, category: normalizeText('Cat A') }, // over by 80
      { name: 'X2', amount: 20, category: normalizeText('Cat A') },
      { name: 'Y1', amount: 100, category: normalizeText('Cat B') }, // under by 100
      { name: 'Z1', amount: 200, category: normalizeText('Cat C') }, // under by 100
    ];
    const once = reallocateOnce({ articles: [...articles], categories: idx, totals: {}, gap: {} });
    expect(once.moved).toBe(true);
    // Should prefer Cat B (same family) if within tolerance
    const { allocation, journal } = rebalanceWithinTolerance([...articles], idx, 100);
    const gaps = allocation.gap;
    const maxDev = Math.max(...Object.values(gaps).map(v => Math.abs(v)));
    expect(maxDev).toBeLessThanOrEqual(10);
    expect(journal.length).toBeGreaterThan(0);
  });
});
