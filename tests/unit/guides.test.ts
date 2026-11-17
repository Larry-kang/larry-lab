import { describe, expect, it } from 'vitest';
import { guides, validateGuides, guideMarkdown, guideCatalog, guidePath } from '../../src/lib/guides';

describe('公開指南資料契約', () => {
  it('有九篇由入門到進階的指南與可引用來源', () => {
    expect(guides).toHaveLength(9);
    expect(new Set(guides.map(g => g.slug)).size).toBe(9);
    for (const g of guides) {
      expect(g.sources.length).toBeGreaterThan(0);
      expect(g.sections.length).toBeGreaterThanOrEqual(3);
      expect(g.checkedAt).toBe('2026-11-17');
      expect(guideMarkdown(g, 'https://example.org')).toContain(`https://example.org${guidePath(g)}`);
      expect(guideMarkdown(g, 'https://example.org')).toContain(g.sections[0].paragraphs[0]);
    }
  });
  it('拒絕重複 slug、非法日期、來源與草稿外洩', () => {
    const first = guides[0];
    expect(() => validateGuides([first, first])).toThrow();
    expect(() => validateGuides([{ ...first, checkedAt: '2026-02-30' }])).toThrow();
    expect(() => validateGuides([{ ...first, slug: '../private' }])).toThrow();
    expect(() => validateGuides([{ ...first, sources: [{ title: 'bad', url: 'javascript:alert(1)' }] }])).toThrow();
    expect(() => validateGuides([{ ...first, sections: [{ ...first.sections[0], id: 'bad anchor' }] }])).toThrow();
    expect(validateGuides([{ ...first, draft: true }])).toEqual([]);
  });
  it('目錄提供 HTML 與 Markdown，但不宣稱提供 MCP', () => {
    const catalog = guideCatalog('https://example.org');
    expect(catalog.mcp.available).toBe(false);
    expect(catalog.guides).toHaveLength(9);
    expect(catalog.guides[0].markdown).toMatch(/\.md$/);
    expect(catalog.guides[0].url).toContain('/guides/etherfi/');
  });
});
