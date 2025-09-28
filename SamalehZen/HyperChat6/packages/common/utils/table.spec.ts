import { describe, it, expect } from 'bun:test';
import { compareHeadersExact, inferColumnTypes, compareTypesWithTolerance } from './table';

describe('compareHeadersExact', () => {
  it('returns true for identical headers (strict)', () => {
    expect(compareHeadersExact(['A', 'B', 'C'], ['A', 'B', 'C'])).toBe(true);
  });
  it('returns false for different case', () => {
    expect(compareHeadersExact(['A'], ['a'])).toBe(false);
  });
  it('returns false for extra spaces', () => {
    expect(compareHeadersExact(['Nom '], ['Nom'])).toBe(false);
  });
  it('returns false for different order', () => {
    expect(compareHeadersExact(['A', 'B'], ['B', 'A'])).toBe(false);
  });
});

describe('inferColumnTypes', () => {
  it('detects numbers (FR and EN formats)', () => {
    const rows = [
      ['1 234,56', 'texte'],
      ['2 000', 'autre'],
      ['3,50', 'x'],
      ['1,234.50', 'y']
    ];
    const types = inferColumnTypes(rows);
    expect(types[0]).toBe('number');
    expect(types[1]).toBe('text');
  });
  it('detects dates in common formats', () => {
    const rows = [
      ['2024-09-01'],
      ['01/10/2024'],
      ['10/01/2024']
    ];
    const types = inferColumnTypes(rows);
    expect(types[0]).toBe('date');
  });
  it('defaults to text when mixed/empty', () => {
    const rows = [
      ['--'],
      [''],
      ['foo']
    ];
    const types = inferColumnTypes(rows);
    expect(types[0]).toBe('text');
  });
});

describe('compareTypesWithTolerance', () => {
  it('accepts when match ratio >= threshold', () => {
    const a = ['number','date','text','text','number'] as const;
    const b = ['number','date','text','number','number'] as const;
    expect(compareTypesWithTolerance(a as any, b as any, 0.8)).toBe(true);
  });
  it('rejects when different length', () => {
    expect(compareTypesWithTolerance(['text'], [], 0.5)).toBe(false);
  });
  it('rejects when match ratio below threshold', () => {
    const a = ['number','date','text','text','number'] as const;
    const b = ['text','text','text','number','date'] as const;
    expect(compareTypesWithTolerance(a as any, b as any, 0.85)).toBe(false);
  });
});
