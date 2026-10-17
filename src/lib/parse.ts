export type ParseOutcome =
  | { kind: 'empty' }
  | { kind: 'ok'; value: number }
  | { kind: 'error'; message: string };

const NUMBER_PATTERN = /^-?(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d+)?$/;
const MAX_LENGTH = 40;

/**
 * Parse a user-typed number. Accepts thousands separators, decimals and an optional leading minus.
 * Rejects currency strings, other signs, exponents and non-finite results.
 */
export function parseNumberText(text: string, opts: { percent?: boolean } = {}): ParseOutcome {
  let source = text.trim();
  if (source === '') return { kind: 'empty' };
  if (source.length > MAX_LENGTH) return { kind: 'error', message: '輸入內容過長' };
  if (opts.percent && source.endsWith('%')) source = source.slice(0, -1).trim();
  if (source === '' || !/\d/.test(source) || !NUMBER_PATTERN.test(source)) {
    return { kind: 'error', message: '請輸入有效的數字（不含幣別或其他文字）' };
  }
  const value = Number(source.replace(/,/g, ''));
  if (!Number.isFinite(value)) return { kind: 'error', message: '請輸入有效的數字' };
  return { kind: 'ok', value };
}

export type Values = { [key: string]: string | boolean | Values | Values[] };

/**
 * Reads typed values out of raw form strings and collects parse errors keyed by field path.
 * Missing/invalid numbers become NaN (or undefined for optional fields) so models report them.
 */
export class FieldReader {
  constructor(
    private readonly values: Values,
    readonly errors: Record<string, string> = {},
    private readonly prefix = '',
  ) {}

  private raw(key: string): string {
    const v = this.values[key];
    return typeof v === 'string' ? v : '';
  }

  private path(key: string): string {
    return this.prefix ? `${this.prefix}.${key}` : key;
  }

  text(key: string): string {
    return this.raw(key).trim();
  }

  choice<T extends string>(key: string): T {
    return this.raw(key) as T;
  }

  /** Required numeric field. */
  number(key: string, opts: { percent?: boolean } = {}): number {
    const outcome = parseNumberText(this.raw(key), opts);
    if (outcome.kind === 'ok') return opts.percent ? outcome.value / 100 : outcome.value;
    if (outcome.kind === 'error') this.errors[this.path(key)] = outcome.message;
    return Number.NaN;
  }

  percent(key: string): number {
    return this.number(key, { percent: true });
  }

  /** Optional numeric field: blank returns undefined. */
  optional(key: string, opts: { percent?: boolean } = {}): number | undefined {
    const outcome = parseNumberText(this.raw(key), opts);
    if (outcome.kind === 'empty') return undefined;
    if (outcome.kind === 'ok') return opts.percent ? outcome.value / 100 : outcome.value;
    this.errors[this.path(key)] = outcome.message;
    return Number.NaN;
  }

  list(key: string): Values[] {
    const v = this.values[key];
    return Array.isArray(v) ? v : [];
  }

  /** Reader for list item `index`; its errors are stored under `${key}.${index}.${field}` in the shared map. */
  item(key: string, index: number): FieldReader {
    return new FieldReader(this.list(key)[index] ?? {}, this.errors, `${this.path(key)}.${index}`);
  }
}