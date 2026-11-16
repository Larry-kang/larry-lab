// 文章系列純函式：不 import astro:content，方便單元測試。
export interface ArticleMeta {
  slug: string;
  title: string;
  description: string;
  series: string;
  seriesOrder: number;
  author: string;
  publishedAt: string;
  updatedAt: string;
  checkedAt: string;
  introFor?: string[];
  status: 'draft' | 'published';
}

export const seriesInfo = {
  etherfi: { title: 'ether.fi 新手系列', path: '/articles/etherfi/', description: '從零開始理解加密貨幣基礎、ether.fi 產品與風險，以及 Cash 卡的申請與付款模式。' },
} as const;

export const articlePath = (slug: string) => `/articles/${slug}/`;

export const isValidDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;

export function validateArticleDates(article: Pick<ArticleMeta, 'slug' | 'publishedAt' | 'updatedAt' | 'checkedAt'>) {
  for (const key of ['publishedAt', 'updatedAt', 'checkedAt'] as const) {
    if (!isValidDate(article[key])) throw new Error(`文章 ${article.slug} 的 ${key} 日期無效：${article[key]}`);
  }
  if (article.updatedAt < article.publishedAt) throw new Error(`文章 ${article.slug} 的 updatedAt 早於 publishedAt`);
}

export function sortSeries<T extends Pick<ArticleMeta, 'series' | 'seriesOrder'>>(articles: T[], series: string): T[] {
  return articles.filter(a => a.series === series).sort((a, b) => a.seriesOrder - b.seriesOrder);
}

export function prevNext<T extends Pick<ArticleMeta, 'slug' | 'series' | 'seriesOrder'>>(articles: T[], slug: string) {
  const current = articles.find(a => a.slug === slug);
  if (!current) throw new Error(`找不到文章：${slug}`);
  const list = sortSeries(articles, current.series);
  const index = list.findIndex(a => a.slug === slug);
  return { prev: list[index - 1], next: list[index + 1] };
}

export function resolveRecommendations<T extends { id: string }>(ids: string[], items: T[]) {
  const found: T[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const item = items.find(i => i.id === id);
    if (item) found.push(item); else missing.push(id);
  }
  return { found, missing };
}

/** rec id → 介紹文章路徑；同一 id 取 seriesOrder 最小的文章。 */
export function buildIntroMap(articles: Pick<ArticleMeta, 'slug' | 'seriesOrder' | 'introFor'>[]): Record<string, string> {
  const best: Record<string, { order: number; slug: string }> = {};
  for (const a of articles) {
    for (const id of a.introFor ?? []) {
      if (!best[id] || a.seriesOrder < best[id].order) best[id] = { order: a.seriesOrder, slug: a.slug };
    }
  }
  return Object.fromEntries(Object.entries(best).map(([id, v]) => [id, articlePath(v.slug)]));
}

export function latestUpdatedAt(articles: Pick<ArticleMeta, 'updatedAt'>[]): string | undefined {
  return articles.map(a => a.updatedAt).sort().at(-1);
}

export function articleStructuredData(article: ArticleMeta, origin: string, siteName: string) {
  const url = new URL(articlePath(article.slug), origin).href;
  const series = seriesInfo[article.series as keyof typeof seriesInfo];
  return {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', '@id': `${url}#article`, headline: article.title, description: article.description, url, mainEntityOfPage: url, inLanguage: 'zh-Hant-TW', author: { '@type': 'Person', name: article.author }, datePublished: article.publishedAt, dateModified: article.updatedAt, isPartOf: series ? { '@type': 'CreativeWorkSeries', name: series.title, url: new URL(series.path, origin).href } : undefined },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: siteName, item: new URL('/', origin).href },
        { '@type': 'ListItem', position: 2, name: series?.title ?? '文章系列', item: new URL(series?.path ?? '/', origin).href },
        { '@type': 'ListItem', position: 3, name: article.title, item: url },
      ] },
    ],
  };
}

/** 草稿（status: draft）不進索引：頁面加 noindex，並排除於 sitemap 與 llms.txt。 */
export const isIndexable = (a: Pick<ArticleMeta, 'status'>) => a.status === 'published';
export const indexableArticles = <T extends Pick<ArticleMeta, 'status'>>(list: T[]) => list.filter(isIndexable);
