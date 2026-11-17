import type { APIRoute } from 'astro';
import { guideCatalog } from '../lib/guides';
export const GET: APIRoute = ({ site }) => new Response(JSON.stringify(guideCatalog(site!.href), null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
