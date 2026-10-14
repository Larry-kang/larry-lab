const GROUPING = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Whole-dollar TWD for summaries, e.g. NT$1,234. */
export function formatTwd(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  const text = GROUPING.format(Math.abs(rounded));
  return `${rounded < 0 ? '-' : ''}NT$${text}`;
}

/** Percent from a decimal ratio, e.g. 0.1234 -> 12.34%. */
export function formatPercent(ratio: number, digits = 2): string {
  if (!Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatMultiple(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(2)} 倍`;
}

/** Cents-level TWD for tables and exports (no currency symbol). */
export function formatCents(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatMonthsAsYears(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} 個月`;
  return rest === 0 ? `${years} 年` : `${years} 年 ${rest} 個月`;
}
