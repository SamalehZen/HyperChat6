import type * as XLSXNS from 'xlsx';
import { parseDate, parseNumberFROrEN, isEmptyCell } from './table';

type ColumnType = 'text' | 'number' | 'date';

type BuildOptions = {
  sheetName?: string;
  commentsSheetName?: string;
};

type Mapping = {
  code: string;
  label: string;
  type: ColumnType;
  decimals: number | null;
  maxLen: number | null;
};

const DEFAULT_SHEET = 'Articles';
const DEFAULT_COMMENTS = "Commentaires d’import";

const FORCE_TEXT_CODES = new Set<string>([
  'CEANAR','NARTAR','NFOUEF','NORAEF','NARCVA','NARCVC','NARCVP','NARXAX','NAROAX','CSECAR','CRAYAR','CFAMAR','CSFAAR','CPAYEF','NMCDNM','NMC1NM','CIFLAR'
]);

const CODE_MAXLEN: Record<string, number> = {
  LARTAR: 35,
  MDIRAR: 10,
  LAREAR: 35,
  LREDAR: 20,
  LETIAR: 35,
  LARFEF: 35,
  CEANAR: 20,
};

function hasDecimalSpec(label: string): { int: number; dec: number } | null {
  const m = label.match(/\((\d{1,3})\s*,\s*(\d{1,2})\)/);
  if (!m) return null;
  return { int: parseInt(m[1], 10), dec: parseInt(m[2], 10) };
}

function hasCharLimit(label: string): number | null {
  const m = label.match(/\((\d{1,3})\)/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

function shouldBeDate(label: string, code: string): boolean {
  if (/date/i.test(label)) return true;
  if (/^DAPL|^DAPL|^DAPLK/i.test(code)) return true;
  return false;
}

function shouldForceText(label: string, code: string): boolean {
  if (FORCE_TEXT_CODES.has(code)) return true;
  if (/(\bcode\b|num[eé]ro|\bN°\b|r[eé]f\.?|nomenclature|pays|marque|libell[ée]|message)/i.test(label)) return true;
  if (/(^CTYAFH$|^STATUT$|^MESS$)/i.test(code)) return true;
  return false;
}

function shouldBeNumber(label: string, code: string): boolean {
  if (hasDecimalSpec(label)) return true;
  if (/(poids|volume|degr[ée]|temp[ée]rature|hauteur|largeur|longueur|quantit[ée]|\bqt[ée]|nombre|nbre|tare|dur[ée]e|d[ée]lai|seuil|incr[ée]ment|position|valeur|prix)/i.test(label)) return true;
  if (/(0=\s*non|1=\s*oui|0\/1)/i.test(label)) return true;
  if (/^NB[A-Z0-9]/.test(code)) return true;
  return false;
}

function decideTypeAndFormat(label: string, code: string): { type: ColumnType; decimals: number | null; maxLen: number | null } {
  if (shouldBeDate(label, code)) return { type: 'date', decimals: null, maxLen: null };
  const decSpec = hasDecimalSpec(label);
  if (decSpec) {
    return { type: 'number', decimals: decSpec.dec, maxLen: null };
  }
  if (shouldForceText(label, code)) {
    const max = CODE_MAXLEN[code] ?? hasCharLimit(label);
    return { type: 'text', decimals: null, maxLen: max ?? null };
  }
  if (shouldBeNumber(label, code)) {
    return { type: 'number', decimals: 0, maxLen: null };
  }
  const max = CODE_MAXLEN[code] ?? hasCharLimit(label);
  return { type: 'text', decimals: null, maxLen: max ?? null };
}

function numberFormat(decimals: number | null): string | undefined {
  if (decimals == null) return undefined;
  if (decimals <= 0) return '#,##0';
  return '#,##0.' + '0'.repeat(decimals);
}

function buildMappings(headersLong: string[], headersCodes: string[]): Mapping[] {
  const out: Mapping[] = [];
  for (let i = 0; i < headersCodes.length; i++) {
    const code = headersCodes[i] || '';
    const label = headersLong[i] || '';
    const d = decideTypeAndFormat(label, code);
    out.push({ code, label, type: d.type, decimals: d.decimals, maxLen: d.maxLen });
  }
  return out;
}

function autoWidths(rows: string[][], min = 8, max = 50): { wch: number }[] {
  const cols = Math.max(0, ...rows.map(r => r.length));
  const widths = new Array(cols).fill(0);
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < cols; c++) {
      const v = rows[r]?.[c] ?? '';
      const len = String(v).length;
      if (len > widths[c]) widths[c] = len;
    }
  }
  return widths.map(w => ({ wch: Math.max(min, Math.min(max, Math.ceil(w * 1.1))) }));
}

export function isCyrusErefAOA(aoa: string[][]): boolean {
  if (!aoa || aoa.length < 3) return false;
  const h1 = aoa[0] || [];
  const h2 = aoa[1] || [];
  if (h1.length !== 159 || h2.length !== 159) return false;
  const last2 = [h2[157]?.toUpperCase?.(), h2[158]?.toUpperCase?.()];
  if (last2[0] !== 'STATUT' || last2[1] !== 'MESS') return false;
  return true;
}

export function buildCyrusErefWorkbook(XLSX: typeof XLSXNS, aoa: string[][], options?: BuildOptions) {
  const sheetName = options?.sheetName || DEFAULT_SHEET;
  const commentsSheetName = options?.commentsSheetName || DEFAULT_COMMENTS;
  const headersLong = aoa[0] || [];
  const headersCodes = aoa[1] || [];
  const data = aoa.slice(2);
  const map = buildMappings(headersLong, headersCodes);
  const rowsForSheet: any[][] = [];
  rowsForSheet.push(headersLong);
  rowsForSheet.push(headersCodes);
  const anomalies: Array<{ row: number; code: string; description: string }> = [];
  for (let r = 0; r < data.length; r++) {
    const srcRow = data[r] || [];
    const dstRow: any[] = new Array(headersCodes.length).fill('');
    for (let c = 0; c < headersCodes.length; c++) {
      const m = map[c];
      const raw = srcRow[c] ?? '';
      if (isEmptyCell(raw)) {
        dstRow[c] = '';
        continue;
      }
      if (m.type === 'date') {
        const d = parseDate(String(raw));
        if (d) {
          dstRow[c] = d;
        } else {
          dstRow[c] = String(raw);
          anomalies.push({ row: r + 1, code: m.code, description: 'Date invalide → forcée en texte' });
        }
        continue;
      }
      if (m.type === 'number') {
        const n = parseNumberFROrEN(String(raw));
        if (n != null) {
          dstRow[c] = n;
        } else {
          dstRow[c] = String(raw);
          anomalies.push({ row: r + 1, code: m.code, description: 'Nombre non parsable → forcé en texte' });
        }
        continue;
      }
      let s = String(raw);
      const max = m.maxLen ?? CODE_MAXLEN[m.code] ?? null;
      if (max != null && s.length > max) {
        s = s.slice(0, max);
        const reason = m.code === 'CEANAR' ? 'EAN > ' + max + ' → tronqué' : 'Longueur > ' + max + ' → tronqué';
        anomalies.push({ row: r + 1, code: m.code, description: reason });
      }
      dstRow[c] = s;
    }
    rowsForSheet.push(dstRow);
  }
  const ws = XLSX.utils.aoa_to_sheet(rowsForSheet);
  const cols = headersCodes.length;
  for (let c = 0; c < cols; c++) {
    const m = map[c];
    const colLetter = XLSX.utils.encode_col(c);
    for (let r = 2; r < rowsForSheet.length; r++) {
      const addr = colLetter + (r + 1);
      const cell = ws[addr];
      if (!cell) continue;
      if (m.type === 'date' && cell.v instanceof Date) {
        cell.t = 'd' as any;
        cell.z = 'dd/mm/yyyy';
      } else if (m.type === 'number' && typeof cell.v === 'number') {
        cell.t = 'n' as any;
        const z = numberFormat(m.decimals);
        if (z) (cell as any).z = z;
      } else {
        cell.t = 's' as any;
      }
    }
  }
  (ws as any)['!cols'] = autoWidths(rowsForSheet);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  if (anomalies.length) {
    const comments = [['Ligne', 'Code', 'Commentaire'], ...anomalies.map(a => [String(a.row), a.code, a.description])];
    const ws2 = XLSX.utils.aoa_to_sheet(comments);
    XLSX.utils.book_append_sheet(wb, ws2, commentsSheetName);
  }
  return { wb, anomalies };
}
