import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from '../../src/lib/csv';
import { MAX_IMPORT_BYTES, buildExport, parseImport, sanitize, type Schema } from '../../src/lib/io';
import { FieldReader, parseNumberText } from '../../src/lib/parse';
import { clearAllTools, loadTool, saveTool } from '../../src/lib/storage';
import recommendationsFile from '../../src/content/recommendations.json';
import ownerProvidedFile from '../../docs/referrals.owner-provided.json';
import {
  activeRecommendations,
  groupByCategory,
  hasUsableReferralLink,
  isAllowedReferralHostname,
  isOfferActive,
  isSafeHttpsUrl,
  publicRecommendations,
  sidebarRecommendations,
  validateRecommendations,
} from '../../src/lib/recommendations';

describe('parseNumberText', () => {
  it('accepts commas, decimals, negatives and percent suffix', () => {
    expect(parseNumberText('1,234,567.5')).toEqual({ kind: 'ok', value: 1234567.5 });
    expect(parseNumberText('  42 ')).toEqual({ kind: 'ok', value: 42 });
    expect(parseNumberText('-0.5')).toEqual({ kind: 'ok', value: -0.5 });
    expect(parseNumberText('.5')).toEqual({ kind: 'ok', value: 0.5 });
    expect(parseNumberText('2.5%', { percent: true })).toEqual({ kind: 'ok', value: 2.5 });
    expect(parseNumberText('0')).toEqual({ kind: 'ok', value: 0 });
  });
  it('treats blank as empty, not zero', () => {
    expect(parseNumberText('')).toEqual({ kind: 'empty' });
    expect(parseNumberText('   ')).toEqual({ kind: 'empty' });
  });
  it('rejects currency strings, exponents, signs and garbage', () => {
    for (const bad of ['NT$100', '$100', '100元', '1e5', '+5', '--1', '1,23', '1..2', 'Infinity', 'NaN', '.', '-', ',', '1 000', '0x10', 'abc', '١٢٣']) {
      expect(parseNumberText(bad).kind, bad).toBe('error');
    }
    expect(parseNumberText('9'.repeat(60)).kind).toBe('error');
  });
});

describe('FieldReader', () => {
  it('collects errors by path and treats blank required fields as NaN', () => {
    const reader = new FieldReader({ a: '12', b: '', c: 'x', list: [{ v: '5' }, { v: 'bad' }] });
    expect(reader.number('a')).toBe(12);
    expect(Number.isNaN(reader.number('b'))).toBe(true);
    expect(reader.errors.b).toBeUndefined();
    expect(Number.isNaN(reader.number('c'))).toBe(true);
    expect(reader.errors.c).toBeDefined();
    expect(reader.optional('b')).toBeUndefined();
    expect(reader.item('list', 0).number('v')).toBe(5);
    reader.item('list', 1).number('v');
    expect(reader.errors['list.1.v']).toBeDefined();
    expect(reader.percent('a')).toBeCloseTo(0.12, 10);
  });
});

describe('CSV safety', () => {
  it('neutralises formula-looking text', () => {
    for (const bad of ['=SUM(A1)', '+1+1', '-2+3', '@cmd', '\tTAB', '\rCR']) {
      expect(csvCell(bad).replace(/^"/, '').startsWith("'"), bad).toBe(true);
    }
  });
  it('quotes separators, quotes and newlines, and escapes quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('plain')).toBe('plain');
  });
  it('writes numbers as numerals including negatives', () => {
    expect(csvCell(-12.5)).toBe('-12.5');
    expect(csvCell(Number.NaN)).toBe('');
    expect(csvCell(null)).toBe('');
  });
  it('adds a BOM and CRLF', () => {
    const out = toCsv([['a', 'b'], [1, 2]]);
    expect(out.startsWith('\uFEFF')).toBe(true);
    expect(out).toContain('a,b\r\n1,2\r\n');
  });
});

describe('JSON import / export', () => {
  const schema: Schema = {
    mode: { kind: 'enum', values: ['x', 'y'] },
    note: { kind: 'text', max: 10 },
    remember: { kind: 'bool' },
    items: { kind: 'list', maxItems: 2, item: { name: { kind: 'text', max: 5 } } },
  };
  const wrap = (inputs: unknown, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ schemaVersion: 1, toolId: 't', inputs, ...extra });

  it('round-trips a valid export', () => {
    const inputs = { mode: 'y', note: 'hello', remember: true, items: [{ name: 'a' }] };
    const result = parseImport(buildExport('t', inputs), 't', schema);
    expect(result).toEqual({ ok: true, value: inputs });
  });
  it('fills defaults for missing fields', () => {
    const result = parseImport(wrap({}), 't', schema);
    expect(result).toEqual({ ok: true, value: { mode: 'x', note: '', remember: false, items: [] } });
  });
  it('drops unknown fields and prototype pollution attempts', () => {
    const text = '{"schemaVersion":1,"toolId":"t","inputs":{"mode":"x","extra":"no","__proto__":{"polluted":"yes"},"constructor":{"prototype":{"polluted":"yes"}}}}';
    const result = parseImport(text, 't', schema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.value).sort()).toEqual(['items', 'mode', 'note', 'remember']);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect((result.value as Record<string, unknown>).polluted).toBeUndefined();
    }
  });
  it('rejects bad version, tool, JSON, types, sizes and enum values', () => {
    expect(parseImport('{bad', 't', schema).ok).toBe(false);
    expect(parseImport('[]', 't', schema).ok).toBe(false);
    expect(parseImport('null', 't', schema).ok).toBe(false);
    expect(parseImport(JSON.stringify({ schemaVersion: 2, toolId: 't', inputs: {} }), 't', schema).ok).toBe(false);
    expect(parseImport(JSON.stringify({ schemaVersion: 1, toolId: 'other', inputs: {} }), 't', schema).ok).toBe(false);
    expect(parseImport(wrap({ note: 5 }), 't', schema).ok).toBe(false);
    expect(parseImport(wrap({ note: 'x'.repeat(11) }), 't', schema).ok).toBe(false);
    expect(parseImport(wrap({ mode: 'z' }), 't', schema).ok).toBe(false);
    expect(parseImport(wrap({ remember: 'true' }), 't', schema).ok).toBe(false);
    expect(parseImport(wrap({ items: 'no' }), 't', schema).ok).toBe(false);
    expect(parseImport(wrap({ items: [{}, {}, {}] }), 't', schema).ok).toBe(false);
    expect(parseImport(wrap({ items: [{ name: 'toolong' }] }), 't', schema).ok).toBe(false);
    expect(parseImport(wrap({ items: [5] }), 't', schema).ok).toBe(false);
  });
  it('rejects files above 100 KB', () => {
    const big = wrap({ note: 'a' }, { pad: 'x'.repeat(MAX_IMPORT_BYTES) });
    expect(parseImport(big, 't', schema)).toEqual({ ok: false, error: '檔案超過 100 KB 上限' });
  });
  it('keeps names as plain text', () => {
    const result = sanitize(schema, { items: [{ name: '<b>x' }] });
    expect(result.ok && (result.value.items as Array<{ name: string }>)[0].name).toBe('<b>x');
  });
});

describe('storage helper', () => {
  const schema: Schema = { note: { kind: 'text' } };
  it('works without localStorage (does not throw)', () => {
    expect(saveTool('t', { note: 'a' })).toBe(false);
    expect(loadTool('t', schema)).toBeNull();
    expect(clearAllTools()).toBe(0);
  });
  it('saves, loads and clears when storage exists', () => {
    const data = new Map<string, string>();
    const fake = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
      key: (i: number) => [...data.keys()][i] ?? null,
      get length() {
        return data.size;
      },
    };
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true });
    try {
      expect(saveTool('t', { note: 'hi' })).toBe(true);
      expect(loadTool('t', schema)).toEqual({ note: 'hi' });
      data.set('larry-lab:v1:tool:t', '{corrupt');
      expect(loadTool('t', schema)).toBeNull();
      data.set('larry-lab:v1:tool:t', JSON.stringify({ schemaVersion: 1, toolId: 'other', inputs: {} }));
      expect(loadTool('t', schema)).toBeNull();
      saveTool('t', { note: 'x' });
      saveTool('u', { note: 'y' });
      data.set('unrelated', '1');
      expect(clearAllTools()).toBe(2);
      expect(data.has('unrelated')).toBe(true);
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
});

describe('recommendations', () => {
  const item = (over: Record<string, unknown> = {}) => ({
    id: 'sample',
    name: '範例平台',
    category: '範例分類',
    shortDescription: '僅供測試的虛構項目',
    enabled: true,
    disclosure: '測試用揭露',
    sortOrder: 1,
    lastVerifiedAt: '2026-10-14',
    referralUrl: 'https://www.linebank.com.tw/R/mgm-portal',
    linkStatus: 'VERIFIED',
    ...over,
  });

  it('RF-01 & RF-02: production data contains all 17 owner-provided items with exact URLs and codes', () => {
    const items = validateRecommendations(recommendationsFile);
    expect(items).toHaveLength(17);
    expect(publicRecommendations(items)).toHaveLength(17);
    expect(groupByCategory(publicRecommendations(items)).map((g) => [g.category, g.items.length])).toEqual([
      ['數位銀行', 6],
      ['證券開戶', 1],
      ['台灣交易所', 2],
      ['國際交易所', 5],
      ['其他加密服務', 3],
    ]);

    // All 17 items enabled (15 verified URLs + 2 code-only)
    const active = activeRecommendations(items);
    expect(active).toHaveLength(17);
    expect(sidebarRecommendations(items)).toHaveLength(3);

    const byId = new Map(items.map((x) => [x.id, x]));
    expect(byId.size).toBe(17);

    // Compare every item against docs/referrals.owner-provided.json
    expect(ownerProvidedFile.items).toHaveLength(17);
    for (const src of ownerProvidedFile.items) {
      const target = byId.get(src.id);
      expect(target, `Missing item ${src.id}`).toBeDefined();
      expect(target!.name).toBe(src.name);
      const expectedProvidedAt = (src as { providedAt?: string }).providedAt ?? ownerProvidedFile.providedAt;
      expect(target!.providedAt).toBe(expectedProvidedAt);
      expect(target!.offerCheckedAt).toBeNull();
      expect(target!.offerText).toBeUndefined();

      if (src.code !== null) {
        expect(target!.code).toBe(src.code);
        expect(target!.referralUrl).toBeUndefined();
        expect(target!.linkStatus).toBe('CODE_ONLY');
        expect(target!.linkCheckedAt).toBeNull();
      } else {
        expect(target!.code).toBeUndefined();
        expect(target!.referralUrl).toBe(src.url);
        expect(target!.linkCheckedAt).toBe('2026-10-17');
      }
    }

    // RF-03: next-bank & rakuten-bank code-only verification
    expect(byId.get('next-bank')?.code).toBe('HCPGD');
    expect(byId.get('next-bank')?.referralUrl).toBeUndefined();
    expect(byId.get('rakuten-bank')?.code).toBe('YCB0Y6');
    expect(byId.get('rakuten-bank')?.referralUrl).toBeUndefined();

    // RF-02: exact query/hash/path preservation on key URLs including bankee & bybit
    expect(byId.get('line-bank')?.referralUrl).toBe('https://www.linebank.com.tw/R/mgm-portal?campaignId=2&uid=bfQnUx');
    expect(byId.get('new-new-bank')?.referralUrl).toBe('https://newnewbank.ubot.com.tw/web/#/S0101001?pm=3&ID=ANIDEZI');
    expect(byId.get('richart')?.referralUrl).toBe(
      'https://richart.tw/TSDIB_RichartWeb/RC07/RC070100?sn=IPE2U&utm_source=richart&utm_medium=app&utm_campaign=richart_mgm_20230701',
    );
    expect(byId.get('bankee')?.referralUrl).toBe('https://www.bankee.tw/webview/app3/M00300/JLG12');
    expect(byId.get('bankee')?.linkStatus).toBe('VERIFIED');
    expect(byId.get('bankee')?.enabled).toBe(true);
    expect(hasUsableReferralLink(byId.get('bankee')!)).toBe(true);
    expect(byId.get('bybit')?.referralUrl).toBe('https://partner.bybit.com/b/157345');
    expect(byId.get('bybit')?.linkStatus).toBe('VERIFIED');
    expect(byId.get('bybit')?.enabled).toBe(true);
    expect(hasUsableReferralLink(byId.get('bybit')!)).toBe(true);
  });

  it('rejects malformed files, unsafe URLs, incoherent status combinations, and unapproved hostnames', () => {
    expect(() => validateRecommendations({})).toThrow();
    expect(() => validateRecommendations({ items: [item({ referralUrl: 'javascript:alert(1)' })] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ referralUrl: 'http://www.linebank.com.tw/' })] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ referralUrl: 'data:text/html,x' })] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ referralUrl: 'https://user:pw@www.linebank.com.tw/' })] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ referralUrl: 'https://example.com/' })] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ referralUrl: 'https://untrusted-phishing.example.org/' })] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ id: 'Bad Id' })] })).toThrow();
    expect(() => validateRecommendations({ items: [item(), item()] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ enabled: 'yes' })] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ lastVerifiedAt: '2026/10/14' })] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ linkStatus: 'INVALID' })] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ linkStatus: undefined })] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ linkStatus: 'CODE_ONLY' })] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ linkStatus: 'UNKNOWN', enabled: true })] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ referralUrl: undefined, linkStatus: 'VERIFIED' })] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ providedAt: null })] })).toThrow();
    expect(isSafeHttpsUrl('https://example.com/')).toBe(true);
    expect(isSafeHttpsUrl('//example.com')).toBe(false);
    expect(isAllowedReferralHostname('https://www.linebank.com.tw/R/mgm-portal')).toBe(true);
    expect(isAllowedReferralHostname('https://example.com/')).toBe(false);
    expect(isAllowedReferralHostname('https://evil.com/')).toBe(false);
  });

  it('shows only enabled items that have a code or a verified link in activeRecommendations, in a fixed order', () => {
    const items = validateRecommendations({
      items: [
        item({ id: 'b', sortOrder: 2 }),
        item({ id: 'a', sortOrder: 1, referralUrl: undefined, code: 'TEST123', linkStatus: 'CODE_ONLY' }),
        item({ id: 'c', sortOrder: 0, enabled: false, linkStatus: 'UNKNOWN' }),
        item({ id: 'd', sortOrder: 3, referralUrl: undefined, linkStatus: undefined }),
        item({ id: 'e', sortOrder: 1 }),
      ],
    });
    expect(activeRecommendations(items).map((x) => x.id)).toEqual(['a', 'e', 'b']);
    expect(publicRecommendations(items).map((x) => x.id)).toEqual(['c', 'a', 'e', 'b']);
    expect(sidebarRecommendations(items, 2).map((x) => x.id)).toEqual(['a', 'e']);
  });

  it('drops expired or unverified offers without inventing dates', () => {
    expect(() => validateRecommendations({ items: [item({ offerText: '未驗證優惠' })] })).toThrow();
    expect(() => validateRecommendations({ items: [item({ offerText: '未驗證優惠', offerStatus: 'UNVERIFIED' })] })).toThrow();
    const [withOffer] = validateRecommendations({ items: [item({ offerText: '虛構優惠', offerExpiresAt: '2026-10-14', offerStatus: 'VERIFIED' })] });
    expect(isOfferActive(withOffer, new Date('2026-10-14T15:00:00Z'))).toBe(true);
    expect(isOfferActive(withOffer, new Date('2026-10-15T16:30:00Z'))).toBe(false);
    expect(isOfferActive({ ...withOffer, offerStatus: 'UNVERIFIED' }, new Date('2026-10-14T15:00:00Z'))).toBe(false);
    expect(isOfferActive({ ...withOffer, offerStatus: undefined }, new Date('2026-10-14T15:00:00Z'))).toBe(false);
    const [noOffer] = validateRecommendations({ items: [item()] });
    expect(isOfferActive(noOffer, new Date())).toBe(false);
  });

  it('groups by category keeping order', () => {
    const items = validateRecommendations({ items: [item({ id: 'a', category: 'X' }), item({ id: 'b', category: 'Y' }), item({ id: 'c', category: 'X' })] });
    expect(groupByCategory(items).map((g) => [g.category, g.items.map((i) => i.id)])).toEqual([
      ['X', ['a', 'c']],
      ['Y', ['b']],
    ]);
  });
});
