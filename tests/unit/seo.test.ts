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
    const xml = buildSitemap('https://example.org');
    expect(xml.match(/<loc>/g)).toHaveLength(tools.length + 6);
    expect(xml.match(/<lastmod>/g)).toHaveLength(tools.length + 6);
    expect(xml).not.toMatch(/404|priority|changefreq/);
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
