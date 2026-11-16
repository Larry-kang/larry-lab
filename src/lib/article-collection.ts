import { getCollection, type CollectionEntry } from 'astro:content';
import { validateArticleDates, type ArticleMeta } from './articles';

export type ArticleEntry = CollectionEntry<'articles'>;

export const toMeta = (entry: ArticleEntry): ArticleMeta => ({ slug: entry.id, ...entry.data });

export async function loadArticles() {
  const entries = await getCollection('articles');
  for (const entry of entries) validateArticleDates(toMeta(entry));
  return entries.sort((a, b) => a.data.seriesOrder - b.data.seriesOrder);
}
