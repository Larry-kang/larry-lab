import { parseNumberText, type Values } from './parse';

export const SCHEMA_VERSION = 1;
export const MAX_IMPORT_BYTES = 100 * 1024;
const MAX_TEXT_LENGTH = 64;

export type FieldDef =
  | { kind: 'text'; max?: number }
  | { kind: 'enum'; values: readonly string[] }
  | { kind: 'bool' }
  | { kind: 'list'; maxItems: number; item: Schema };

export type Schema = Record<string, FieldDef>;

export type SanitizeResult<T> = { ok: true; value: T } | { ok: false; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const has = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Copy only the fields defined by `schema` out of untrusted data. Unknown keys (including
 * `__proto__`, `constructor`) are ignored; wrong types or oversize values are rejected.
 */
export function sanitize(schema: Schema, input: unknown, path = ''): SanitizeResult<Values> {
  if (!isPlainObject(input)) return { ok: false, error: `${path || '根層'}必須為物件` };
  const output: Values = {};
  for (const [key, def] of Object.entries(schema)) {
    const here = path ? `${path}.${key}` : key;
    const present = has(input, key);
    const raw = present ? input[key] : undefined;
    switch (def.kind) {
      case 'text': {
        if (!present || raw === undefined) {
          output[key] = '';
        } else if (typeof raw !== 'string') {
          return { ok: false, error: `欄位 ${here} 必須為文字` };
        } else if (raw.length > (def.max ?? MAX_TEXT_LENGTH)) {
          return { ok: false, error: `欄位 ${here} 內容過長` };
        } else {
          output[key] = raw;
        }
        break;
      }
      case 'enum': {
        if (!present || raw === undefined) {
          output[key] = def.values[0];
        } else if (typeof raw !== 'string' || !def.values.includes(raw)) {
          return { ok: false, error: `欄位 ${here} 的值不受支援` };
        } else {
          output[key] = raw;
        }
        break;
      }
      case 'bool': {
        if (!present || raw === undefined) output[key] = false;
        else if (typeof raw !== 'boolean') return { ok: false, error: `欄位 ${here} 必須為布林值` };
        else output[key] = raw;
        break;
      }
      case 'list': {
        if (!present || raw === undefined) {
          output[key] = [];
        } else if (!Array.isArray(raw)) {
          return { ok: false, error: `欄位 ${here} 必須為陣列` };
        } else if (raw.length > def.maxItems) {
          return { ok: false, error: `欄位 ${here} 項目過多（上限 ${def.maxItems}）` };
        } else {
          const items: Values[] = [];
          for (let i = 0; i < raw.length; i += 1) {
            const result = sanitize(def.item, raw[i], `${here}[${i}]`);
            if (!result.ok) return result;
            items.push(result.value);
          }
          output[key] = items;
        }
        break;
      }
    }
  }
  return { ok: true, value: output };
}

export interface ExportFile {
  schemaVersion: number;
  toolId: string;
  inputs: Values;
}

export function buildExport(toolId: string, inputs: Values): string {
  const file: ExportFile = { schemaVersion: SCHEMA_VERSION, toolId, inputs };
  return `${JSON.stringify(file, null, 2)}\n`;
}

function parseRateValue(text: string): { ok: true; value: number } | { ok: false; error: string } {
  const outcome = parseNumberText(text, { percent: true });
  if (outcome.kind !== 'ok') {
    return { ok: false, error: '格式不正確或含有非數字字元' };
  }
  const val = outcome.value;
  if (!Number.isFinite(val) || val < 0 || val > 100) {
    return { ok: false, error: '年利率必須介於 0% 至 100% 之間' };
  }
  return { ok: true, value: val };
}

export function migrateMortgageInputs(inputs: unknown): SanitizeResult<unknown> {
  if (!isPlainObject(inputs)) return { ok: false, error: '輸入資料格式不正確' };
  if (!Array.isArray(inputs.scenarios)) return { ok: true, value: inputs };

  for (let i = 0; i < inputs.scenarios.length; i += 1) {
    const sc = inputs.scenarios[i];
    if (!isPlainObject(sc)) continue;

    const fixedRateStr = typeof sc.fixedRate === 'string' ? sc.fixedRate.trim() : undefined;
    const hasFixed = fixedRateStr !== undefined && fixedRateStr !== '';
    const segmentsArr = Array.isArray(sc.segments) ? sc.segments : undefined;
    const hasSegments = segmentsArr !== undefined && segmentsArr.length > 0;
    const seg0 = hasSegments && isPlainObject(segmentsArr[0]) ? segmentsArr[0] : null;
    const firstSegRate = seg0 && typeof seg0.annualRate === 'string' && seg0.annualRate.trim() !== ''
      ? seg0.annualRate.trim()
      : undefined;

    // 若有提供 fixedRate，嚴格檢查格式、有限值與範圍
    let fixedNum: number | undefined;
    if (hasFixed) {
      const parsed = parseRateValue(fixedRateStr!);
      if (!parsed.ok) {
        return { ok: false, error: `方案 ${i + 1} 的固定年利率無效（${parsed.error}）` };
      }
      fixedNum = parsed.value;
    }

    // 若有提供 firstSegRate，嚴格檢查格式、有限值與範圍
    let seg0Num: number | undefined;
    if (firstSegRate !== undefined) {
      const parsed = parseRateValue(firstSegRate);
      if (!parsed.ok) {
        return { ok: false, error: `方案 ${i + 1} 的第一段年利率無效（${parsed.error}）` };
      }
      seg0Num = parsed.value;
    }

    // 衝突檢核：若同時提供固定利率與首段利率，且兩者數值不同，必須拒絕以防偷偷覆蓋
    if (fixedNum !== undefined && seg0Num !== undefined) {
      if (Math.abs(fixedNum - seg0Num) > 1e-7) {
        return {
          ok: false,
          error: `方案 ${i + 1} 的固定年利率（${fixedRateStr}%）與第一段利率（${firstSegRate}%）設定衝突，未覆寫目前設定`,
        };
      }
      // 數值等值：以首段利率格式為準同步 fixedRate，維持完全一致
      sc.fixedRate = firstSegRate;
    }

    // 遷移：如果舊版/外部檔案只有 fixedRate 而無 segments
    if (hasFixed && !hasSegments) {
      sc.segments = [{ startMonth: '1', annualRate: fixedRateStr }];
    }

    // 遷移：如果舊版只有 segments 而無 fixedRate，以首段利率補齊 fixedRate
    if (firstSegRate !== undefined && !hasFixed) {
      sc.fixedRate = firstSegRate;
    }
  }

  return { ok: true, value: inputs };
}

/** Validate an imported JSON document. Never throws; the caller keeps its current state on error. */
export function parseImport(text: string, toolId: string, schema: Schema): SanitizeResult<Values> {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) {
    return { ok: false, error: '檔案超過 100 KB 上限' };
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: '檔案不是有效的 JSON' };
  }
  if (!isPlainObject(data)) return { ok: false, error: '檔案格式不正確' };
  if (data.schemaVersion !== SCHEMA_VERSION) return { ok: false, error: '不支援的檔案版本' };
  if (data.toolId !== toolId) return { ok: false, error: '此檔案不屬於這個工具' };

  if (toolId === 'mortgage') {
    const mig = migrateMortgageInputs(data.inputs);
    if (!mig.ok) return mig as SanitizeResult<Values>;
  }

  return sanitize(schema, data.inputs);
}
