import type { APIRoute } from 'astro';
import { buildSitemap } from '../lib/seo';
import { loadArticles, toMeta } from '../lib/article-collection';

export const GET: APIRoute = async ({ site }) => {
  const articles = (await loadArticles()).map(toMeta);
  return new Response(buildSitemap(site!.href, articles), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
