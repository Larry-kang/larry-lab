import { site, tools } from '../config/site';
import { toolContent } from '../content/tool-content';
import pageUpdates from '../content/page-updates.json';
import { articlePath, latestUpdatedAt, seriesInfo, type ArticleMeta } from './articles';

export type SeoArticle = Pick<ArticleMeta, 'slug' | 'title' | 'description' | 'updatedAt'>;

export const toolDescription = (id: string) => {
  const tool = tools.find(tool => tool.id === id);
  if (!tool) throw new Error(`未知工具：${id}`);
  return `${tool.summary}重點產出：${tool.mainOutputs}`;
};

export const serializeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

export function toolStructuredData(id: string, origin: string) {
  const tool = tools.find(tool => tool.id === id);
  if (!tool) throw new Error(`未知工具：${id}`);
  const url = new URL(tool.path, origin).href;
  return {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebApplication', '@id': `${url}#app`, name: tool.name, url, description: toolDescription(id), applicationCategory: 'FinanceApplication', operatingSystem: 'Web browser', browserRequirements: 'Requires JavaScript', inLanguage: 'zh-Hant-TW', isAccessibleForFree: true, offers: { '@type': 'Offer', price: 0, priceCurrency: 'TWD' }, featureList: [tool.mainOutputs, '免登入，試算輸入在瀏覽器本機計算'], dateModified: toolContent[id].updatedAt },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: site.name, item: new URL('/', origin).href }, { '@type': 'ListItem', position: 2, name: '工具大全', item: new URL('/tools/', origin).href }, { '@type': 'ListItem', position: 3, name: tool.name, item: url }] },
    ],
  };
}

export function buildLlms(origin: string, articles: SeoArticle[] = []): string {
  const articleSection = articles.length ? `\n## 文章\n\n- [${seriesInfo.etherfi.title}](${new URL(seriesInfo.etherfi.path, origin).href}): ${seriesInfo.etherfi.description}\n${articles.map(a => `- [${a.title}](${new URL(articlePath(a.slug), origin).href}): ${a.description}`).join('\n')}\n` : '';
  return `# ${site.name}\n\n> ${site.description}\n\n免登入；互動試算需要 JavaScript。內容與範例不構成個人化財務建議，固定報酬模型不保證未來結果。\n\n## 試算工具\n\n${tools.map(tool => `- [${tool.name}](${new URL(tool.path, origin).href}): ${toolDescription(tool.id)}\n  - [假設與公式](${new URL(`/methodology/#${tool.id}`, origin).href})`).join('\n')}\n\n## 方法與政策\n\n- [計算方法](${new URL('/methodology/', origin).href})\n- [隱私說明](${new URL('/privacy/', origin).href})\n- [推薦與利益揭露](${new URL('/recommendations/#disclosure', origin).href}): 推薦不影響試算，優惠條件以平台公告為準。\n${articleSection}`;
}

export function buildSitemap(origin: string, articles: SeoArticle[] = []): string {
  const latest = Object.values(toolContent).map(item => item.updatedAt).sort().at(-1)!;
  // 非工具頁的日期是內容審核日期，不是每次建置的時間。
  const entries: [string, string][] = [...Object.entries(pageUpdates).map(([path, page]) => [path, ['/', '/tools/', '/methodology/'].includes(path) ? [latest, page.updatedAt].sort().at(-1)! : page.updatedAt] as [string, string]), ...tools.map(tool => [tool.path, toolContent[tool.id].updatedAt] as [string, string])];
  const articleLatest = latestUpdatedAt(articles);
  if (articleLatest) entries.push([seriesInfo.etherfi.path, articleLatest], ...articles.map(a => [articlePath(a.slug), a.updatedAt] as [string, string]));
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  for (const [, date] of entries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error(`sitemap 日期無效：${date}`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(([path, date]) => `<url><loc>${escape(new URL(path, origin).href)}</loc><lastmod>${date}</lastmod></url>`).join('')}</urlset>`;
}
