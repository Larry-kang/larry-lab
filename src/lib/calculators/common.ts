/**
 * Shared numeric helpers and limits for all calculators.
 * Amounts are TWD; rates are decimals (0.05 = 5%) unless a name says "Percent".
 */

export const MODEL_VERSION = '1.0';
export const MODEL_UPDATED_AT = '2026-10-14';

export const MAX_AMOUNT = 1_000_000_000;
/** Principal reconciliation tolerance (TWD). */
export const MONEY_TOLERANCE = 0.01;

export type FieldErrors = Record<string, string>;

export type ResultStatus = 'valid' | 'invalid' | 'infeasible' | 'no-debt' | 'no-equity';

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value);
}

/** Check a numeric value lies in [min, max]; returns an error text or undefined. */
export function rangeError(
  value: number | undefined,
  label: string,
  min: number,
  max: number,
  opts: { integer?: boolean; unit?: string } = {},
): string | undefined {
  const unit = opts.unit ?? '';
  if (value === undefined || !isFiniteNumber(value)) return `請輸入「${label}」`;
  if (opts.integer && !Number.isInteger(value)) return `「${label}」必須為整數`;
  if (value < min || value > max) {
    return `「${label}」須介於 ${formatPlain(min)}${unit} 至 ${formatPlain(max)}${unit}`;
  }
  return undefined;
}

function formatPlain(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

/**
 * Level payment for principal `p`, periodic rate `i` and `n` periods.
 * Uses log1p/expm1 so tiny rates stay numerically stable.
 */
export function annuityPayment(p: number, i: number, n: number): number {
  if (n <= 0) return p;
  if (i === 0) return p / n;
  const denom = -Math.expm1(-n * Math.log1p(i)); // 1 - (1+i)^-n
  return (p * i) / denom;
}

/** Round to cents for exports only (never used inside the model). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
