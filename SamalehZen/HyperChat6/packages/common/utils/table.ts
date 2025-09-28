export type ColumnType = 'number' | 'date' | 'text';

export function isEmptyCell(value: string | null | undefined): boolean {
  if (value == null) return true;
  const v = String(value).trim();
  if (!v) return true;
  const empties = ['-', '—', '–', 'NA', 'N/A'];
  return empties.includes(v);
}

function normalizeNumberInput(raw: string): string {
  return raw
    .replace(/[%€£$]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseNumberFROrEN(input: string): number | null {
  if (!input) return null;
  let s = normalizeNumberInput(input);
  // Remove spaces used as thousands
  s = s.replace(/\s/g, '');

  // Both comma and dot present
  if (s.includes(',') && s.includes('.')) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastDot > lastComma) {
      // Dot as decimal, commas as thousands
      s = s.replace(/,/g, '');
    } else {
      // Comma as decimal, dots as thousands
      s = s.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (s.includes(',')) {
    // Assume comma is decimal
    s = s.replace(/,/g, '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseDate(input: string): Date | null {
  if (!input) return null;
  const s = input.trim();
  // ISO like 2024-09-30 or 2024/09/30
  let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (m) {
    const [_, y, mo, d] = m;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    return isNaN(dt.getTime()) ? null : dt;
  }
  // dd/mm/yyyy or dd-mm-yyyy
  m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    if (mm > 12 && dd <= 12) {
      const dt = new Date(yyyy, dd - 1, mm);
      return isNaN(dt.getTime()) ? null : dt;
    }
    const dt = new Date(yyyy, mm - 1, dd);
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

export function inferColumnTypes(rows: string[][]): ColumnType[] {
  const maxLen = Math.max(0, ...rows.map(r => r.length));
  const types: ColumnType[] = new Array(maxLen).fill('text');
  for (let c = 0; c < maxLen; c++) {
    let numCount = 0;
    let dateCount = 0;
    let textCount = 0;
    let sampleCount = 0;
    for (let r = 0; r < rows.length; r++) {
      const v = rows[r]?.[c] ?? '';
      if (isEmptyCell(v)) continue;
      sampleCount++;
      if (parseNumberFROrEN(v) != null) {
        numCount++;
        continue;
      }
      if (parseDate(v) != null) {
        dateCount++;
        continue;
      }
      textCount++;
    }
    if (sampleCount === 0) {
      types[c] = 'text';
    } else if (numCount >= dateCount && numCount >= textCount) {
      types[c] = 'number';
    } else if (dateCount >= numCount && dateCount >= textCount) {
      types[c] = 'date';
    } else {
      types[c] = 'text';
    }
  }
  return types;
}

export function compareHeadersExact(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function compareTypesWithTolerance(a: ColumnType[], b: ColumnType[], threshold = 0.85): boolean {
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  let same = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) same++;
  }
  const ratio = same / a.length;
  return ratio >= threshold;
}

export function tableElementToAOA(table: HTMLTableElement): string[][] {
  const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[];
  const aoa: string[][] = [];
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('th,td')) as HTMLTableCellElement[];
    const rowData = cells.map(cell => (cell.textContent || '').trim());
    if (rowData.length > 0) aoa.push(rowData);
  }
  return aoa;
}
