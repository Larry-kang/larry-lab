import type { APIRoute } from 'astro';
import { buildSitemap } from '../lib/seo';

export const GET: APIRoute = ({ site }) => {
  return new Response(buildSitemap(site!.href), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
