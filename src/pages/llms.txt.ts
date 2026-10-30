import type { APIRoute } from 'astro';
import { buildLlms } from '../lib/seo';
import { loadArticles, toMeta } from '../lib/article-collection';
export const GET: APIRoute = async ({ site }) => new Response(buildLlms(site!.href, (await loadArticles()).map(toMeta)), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
