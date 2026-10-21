/** 只編排金額字串，不捨入、不刪除非法字元。regroup 僅用於既有有效金額的逐字編輯。 */
export function formatAmountEdit(text: string, start: number, end: number, regroup = false): {text: string; start: number; end: number} {
  const source = text.trim();
  const leading = text.length - text.trimStart().length;
  const valid = /^-?(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d*)?$/.test(source);
  const editable = regroup && /^-?[\d,]*(?:\.\d*)?$/.test(source);
  if (!valid && !editable) return { text, start, end };
  const raw = source.replace(/,/g, '');
  const [integer, fraction] = raw.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = grouped + (fraction === undefined ? '' : `.${fraction}`);
  const position = (offset: number) => {
    const count = source.slice(0, Math.max(0, offset - leading)).replace(/,/g, '').length;
    if (count === 0) return 0;
    let seen = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (formatted[i] !== ',') seen++;
      if (seen === count) return i + 1;
    }
    return formatted.length;
  };
  return { text: formatted, start: position(start), end: position(end) };
}

export function monthsFromParts(years: string, extra: string): string {
  if (years === '' && (extra === '' || extra === '0')) return '';
  const yearPart = years === '' ? '0' : years;
  const monthPart = extra === '' ? '0' : extra;
  if (!/^\d+$/.test(yearPart) || !/^\d+$/.test(monthPart) || Number(monthPart) > 11) return 'invalid-year-month';
  const total = Number(yearPart) * 12 + Number(monthPart);
  return Number.isSafeInteger(total) ? String(total) : 'invalid-year-month';
}

/** 選填的 UI 草稿只能對應同一個無效月份值，不能覆蓋有效金融輸入。 */
export function restoreMonthDraft(serialized: unknown, model: string): {years: string; extra: string} | null {
  if (model !== 'invalid-year-month' || typeof serialized !== 'string') return null;
  try {
    const draft = JSON.parse(serialized);
    if (!draft || typeof draft.years !== 'string' || typeof draft.extra !== 'string' || draft.years.length > 40 || draft.extra.length > 2) return null;
    return monthsFromParts(draft.years, draft.extra) === model ? { years: draft.years, extra: draft.extra } : null;
  } catch { return null; }
}

export function monthDescription(raw: string): string {
  if (!/^\d+$/.test(raw)) return '';
  const months = Number(raw);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `${months} 個月＝${years} 年${rest ? ` ${rest} 個月` : ''}`;
}
