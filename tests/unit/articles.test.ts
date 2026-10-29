import { describe, expect, it } from 'vitest';
import { articleStructuredData, buildIntroMap, prevNext, resolveRecommendations, sortSeries, validateArticleDates } from '../../src/lib/articles';
import { buildLlms } from '../../src/lib/seo';

const base = { series: 'etherfi', author: 'Larry', publishedAt: '2026-10-29', updatedAt: '2026-10-29', checkedAt: '2026-10-29', description: 'd' };
const list = [
  { ...base, slug: 'c', title: 'C', seriesOrder: 3, introFor: ['ether-fi'] },
  { ...base, slug: 'a', title: 'A', seriesOrder: 1 },
  { ...base, slug: 'b', title: 'B', seriesOrder: 2, introFor: ['ether-fi'] },
];

describe('文章系列純函式', () => {
  it('依 seriesOrder 排序並算出上下篇', () => {
    expect(sortSeries(list, 'etherfi').map(a => a.slug)).toEqual(['a', 'b', 'c']);
    expect(prevNext(list, 'a')).toMatchObject({ prev: undefined, next: { slug: 'b' } });
    expect(prevNext(list, 'b')).toMatchObject({ prev: { slug: 'a' }, next: { slug: 'c' } });
    expect(prevNext(list, 'c').next).toBeUndefined();
    expect(() => prevNext(list, 'zzz')).toThrow();
  });
  it('缺少的推薦 id 回報 missing，不捏造', () => {
    const r = resolveRecommendations(['ether-fi', 'nope'], [{ id: 'ether-fi' }]);
    expect(r.found.map(i => i.id)).toEqual(['ether-fi']);
    expect(r.missing).toEqual(['nope']);
  });
  it('introMap 同一 rec id 取 seriesOrder 最小者', () => {
    expect(buildIntroMap(list)).toEqual({ 'ether-fi': '/articles/b/' });
  });
  it('JSON-LD 為 Article + BreadcrumbList，作者 Larry', () => {
    const data = articleStructuredData(list[1], 'https://example.org', 'Larry Lab');
    expect(data['@graph'][0]).toMatchObject({ '@type': 'Article', dateModified: '2026-10-29', inLanguage: 'zh-Hant-TW', author: { '@type': 'Person', name: 'Larry' } });
    expect(data['@graph'][1].itemListElement).toHaveLength(3);
  });
  it('拒絕無效日期', () => {
    expect(() => validateArticleDates({ ...list[0], checkedAt: '2026-02-30' })).toThrow();
    expect(() => validateArticleDates({ ...list[0], updatedAt: '2026-01-01' })).toThrow();
    expect(() => validateArticleDates(list[0])).not.toThrow();
  });
  it('llms.txt 加入文章段落', () => {
    const text = buildLlms('https://example.org', list);
    expect(text).toContain('## 文章');
    expect(text).toContain('https://example.org/articles/etherfi/');
    expect(text).toContain('https://example.org/articles/a/');
  });
});
