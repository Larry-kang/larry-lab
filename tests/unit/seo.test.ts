import { describe, expect, it } from 'vitest';
import { tools } from '../../src/config/site';
import { toolContent, validateToolContent } from '../../src/content/tool-content';
import { buildLlms, buildSitemap, serializeJsonLd, toolStructuredData } from '../../src/lib/seo';

describe('SEO 內容來源與靜態資料', () => {
  it('每個公開工具皆有完整內容與有效相關工具', () => {
    expect(() => validateToolContent(toolContent)).not.toThrow();
    expect(Object.keys(toolContent).sort()).toEqual(tools.map(t => t.id).sort());
  });
  it('拒絕缺漏、未知關聯與無效日期', () => {
    const missing = { ...toolContent }; delete missing.mortgage;
    expect(() => validateToolContent(missing)).toThrow();
    expect(() => validateToolContent({ ...toolContent, mortgage: { ...toolContent.mortgage, related: ['missing'] } })).toThrow();
    expect(() => validateToolContent({ ...toolContent, mortgage: { ...toolContent.mortgage, updatedAt: '2026-02-30' } })).toThrow();
  });
  it('同源輸出五工具導覽與方法論錨點', () => {
    const text = buildLlms('https://example.org');
    for (const tool of tools) {
      expect(text).toContain(`https://example.org${tool.path}`);
      expect(text).toContain(`/methodology/#${tool.id}`);
    }
  });
  it('sitemap 有審核日期但沒有無效搜尋提示', () => {
    const articles = [{ slug: 'a', title: 'A', description: 'd', updatedAt: '2026-10-29', status: 'published' as const }, { slug: 'b', title: 'B', description: 'd', updatedAt: '2026-10-28', status: 'published' as const }];
    const xml = buildSitemap('https://example.org', articles);
    // 工具 + 6 個固定頁 + 文章數 + 1 個系列索引頁
    expect(xml.match(/<loc>/g)).toHaveLength(tools.length + 6 + articles.length + 1);
    expect(xml.match(/<lastmod>/g)).toHaveLength(tools.length + 6 + articles.length + 1);
    expect(xml).toContain('<loc>https://example.org/articles/etherfi/</loc><lastmod>2026-10-29</lastmod>');
    expect(buildSitemap('https://example.org').match(/<loc>/g)).toHaveLength(tools.length + 6);
    expect(xml).not.toMatch(/404|priority|changefreq/);
  });
  it('草稿文章排除於 sitemap 與 llms；全為草稿時系列索引也排除', () => {
    const pub = { slug: 'pub', title: 'P', description: 'd', updatedAt: '2026-10-20', status: 'published' as const };
    const draft = { slug: 'drf', title: 'D', description: 'd', updatedAt: '2026-10-29', status: 'draft' as const };
    const xml = buildSitemap('https://example.org', [pub, draft]);
    expect(xml.match(/<loc>/g)).toHaveLength(tools.length + 6 + 1 + 1);
    expect(xml).not.toContain('/articles/drf/');
    expect(xml).toContain('<loc>https://example.org/articles/etherfi/</loc><lastmod>2026-10-20</lastmod>');
    const llms = buildLlms('https://example.org', [pub, draft]);
    expect(llms).toContain('/articles/pub/');
    expect(llms).not.toContain('/articles/drf/');
    const onlyDraft = buildSitemap('https://example.org', [draft]);
    expect(onlyDraft.match(/<loc>/g)).toHaveLength(tools.length + 6);
    expect(onlyDraft).not.toContain('/articles/');
    expect(buildLlms('https://example.org', [draft])).not.toContain('/articles/');
  });
  it('JSON-LD 不捏造評分且阻擋結束 script 的文字', () => {
    const data = toolStructuredData('mortgage', 'https://example.org');
    expect(JSON.stringify(data)).toContain('WebApplication');
    expect(JSON.stringify(data)).not.toMatch(/aggregateRating|review|FAQPage/);
    const json = serializeJsonLd({ text: '</script><script>alert(1)</script>' });
    expect(json).not.toContain('<');
    expect(JSON.parse(json).text).toBe('</script><script>alert(1)</script>');
  });
});
