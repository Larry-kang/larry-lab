import type { APIRoute } from 'astro';
import { buildLlms } from '../lib/seo';
export const GET: APIRoute = ({ site }) => new Response(buildLlms(site!.href), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
