/** 只編排金額字串，不捨入、不刪除非法字元。regroup 僅用於既有有效金額的逐字編輯。 */
export function formatAmountEdit(text: string, start: number, end: number, regroup = false): {text: string; start: number; end: number} {
  const valid = /^-?(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d*)?$/.test(text);
  const editable = regroup && /^-?[\d,]*(?:\.\d*)?$/.test(text);
  if (!valid && !editable) return { text, start, end };
  const raw = text.replace(/,/g, '');
  const [integer, fraction] = raw.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = grouped + (fraction === undefined ? '' : `.${fraction}`);
  const position = (offset: number) => {
    const count = text.slice(0, offset).replace(/,/g, '').length;
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
  if (years === '') return '';
  if (!/^\d+$/.test(years) || !/^\d+$/.test(extra) || Number(extra) > 11) return '請填整數年及 0–11 個月';
  const total = Number(years) * 12 + Number(extra);
  return Number.isSafeInteger(total) ? String(total) : '年限超出範圍';
}

export function monthDescription(raw: string): string {
  if (!/^\d+$/.test(raw)) return '';
  const months = Number(raw);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `${months} 個月＝${years} 年${rest ? ` ${rest} 個月` : ''}`;
}
