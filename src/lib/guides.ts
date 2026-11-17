import guideData from '../content/guides.json' with { type: 'json' };
import recommendationsFile from '../content/recommendations.json' with { type: 'json' };
import { hasUsableReferralLink, publicRecommendations, validateRecommendations } from './recommendations';
import { site, tools } from '../config/site';

export interface Guide {
  slug: string;
  title: string;
  summary: string;
  level: string;
  prerequisites: string;
  checkedAt: string;
  draft: boolean;
  sections: { id: string; title: string; paragraphs: string[] }[];
  sources: { title: string; url: string }[];
}

export function validateGuides(items: Guide[]): Guide[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) || seen.has(item.slug)) throw new Error('指南 slug 無效或重複');
    seen.add(item.slug);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.checkedAt) || !Number.isFinite(Date.parse(item.checkedAt)) || new Date(item.checkedAt).toISOString().slice(0, 10) !== item.checkedAt) throw new Error('指南日期無效');
    if (![item.title, item.summary, item.level, item.prerequisites].every(value => value.trim()) || item.sections.length < 3 || !item.sources.length) throw new Error('指南內容不足');
    const ids = item.sections.map(section => section.id);
    if (new Set(ids).size !== ids.length || item.sections.some(section => !/^[a-z0-9-]+$/.test(section.id) || !section.title.trim() || !section.paragraphs.length || section.paragraphs.some(p => !p.trim()))) throw new Error('指南段落無效');
    for (const source of item.sources) {
      const url = new URL(source.url);
      if (url.protocol !== 'https:' || url.hostname !== 'etherfi.gitbook.io' || url.username || url.password || !source.title.trim()) throw new Error('指南來源無效');
    }
  }
  return items.filter(item => !item.draft);
}

export const guides = validateGuides(guideData);
export const guidePath = (guide: Guide) => `/guides/etherfi/${guide.slug}/`;
export const guideMarkdownPath = (guide: Guide) => `/guides/etherfi/${guide.slug}.md`;
export const guideUpdatedAt = guides.map(g => g.checkedAt).sort().at(-1)!;
export const guideNotice = '本文依官方文件整理，未進行帳戶、入金或交易實測；不提供個人化投資建議。費用、資格及可用功能請以官方現行條款與帳戶顯示為準。';
export const etherfiReferral = publicRecommendations(validateRecommendations(recommendationsFile)).find(item => item.id === 'ether-fi' && hasUsableReferralLink(item));

export function guideMarkdown(guide: Guide, origin: string): string {
  const index = guides.findIndex(item => item.slug === guide.slug);
  return `# ${guide.title}\n\n${guide.summary}\n\n作者：Larry Lab\n資料查核日期：${guide.checkedAt}\n程度：${guide.level}\n原文：${new URL(guidePath(guide), origin).href}\n\n閱讀前提：${guide.prerequisites}\n\n${guideNotice}\n\n${guide.sections.map(section => `## ${section.title}\n\n${section.paragraphs.join('\n\n')}`).join('\n\n')}\n\n## 官方來源\n\n${guide.sources.map(source => `- [${source.title}](${source.url})`).join('\n')}\n\n## 相關閱讀\n\n- [系列目錄](${new URL('/guides/etherfi/', origin).href})\n${[guides[index - 1], guides[index + 1]].filter(Boolean).map(item => `- [${item.title}](${new URL(guidePath(item), origin).href})`).join('\n')}\n\n## 推薦與利益揭露\n\n${site.referralNotice}\n${etherfiReferral?.referralUrl ? `\n[ether.fi 推薦連結（商業推薦）](${etherfiReferral.referralUrl})\n` : ''}`;
}

export function guideCatalog(origin: string) {
  return {
    schemaVersion: 1, name: 'Larry Lab 公開內容目錄', updatedAt: guideUpdatedAt,
    usage: '公開閱讀資料，不是 MCP 端點；試算工具需在瀏覽器操作，不接受遠端計算請求。不得由推薦連結推定產品適合或優惠有效。',
    mcp: { available: false },
    disclosure: site.referralNotice,
    guides: guides.map(guide => ({ title: guide.title, summary: guide.summary, level: guide.level, prerequisites: guide.prerequisites, checkedAt: guide.checkedAt, url: new URL(guidePath(guide), origin).href, markdown: new URL(guideMarkdownPath(guide), origin).href, sources: guide.sources })),
    tools: tools.map(tool => ({ name: tool.name, url: new URL(tool.path, origin).href, execution: 'browser-local', methodology: new URL(`/methodology/#${tool.id}`, origin).href })),
  };
}

export function guideStructuredData(guide: Guide, origin: string) {
  const url = new URL(guidePath(guide), origin).href;
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Article', '@id': `${url}#article`, headline: guide.title, description: guide.summary, url, mainEntityOfPage: url, inLanguage: 'zh-Hant-TW', author: { '@type': 'Organization', name: site.name, url: new URL('/', origin).href }, dateModified: guide.checkedAt, isAccessibleForFree: true, citation: guide.sources.map(source => source.url), articleSection: 'ether.fi 新手指南' },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: site.name, item: new URL('/', origin).href }, { '@type': 'ListItem', position: 2, name: '教學指南', item: new URL('/guides/', origin).href }, { '@type': 'ListItem', position: 3, name: 'ether.fi 新手指南', item: new URL('/guides/etherfi/', origin).href }, { '@type': 'ListItem', position: 4, name: guide.title, item: url }] },
  ] };
}
