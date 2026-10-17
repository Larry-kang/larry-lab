export type CsvCell = string | number | null | undefined;

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Serialise one cell. Text that a spreadsheet could interpret as a formula is neutralised with a
 * leading apostrophe; numbers are written as plain numerals (never as text).
 */
export function csvCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'number') {
    return Number.isFinite(cell) ? String(cell) : '';
  }
  let text = cell;
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text) || text !== text.trim()) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** CSV with CRLF line endings and a UTF-8 BOM so spreadsheets read Chinese text correctly. */
export function toCsv(rows: CsvCell[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

/** Round to cents for export columns; keeps the value numeric. */
export function cents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
