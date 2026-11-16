import type { APIRoute } from 'astro';
import { guides, guideMarkdown } from '../../../lib/guides';
export function getStaticPaths() { return guides.map(guide => ({ params: { slug: guide.slug }, props: { guide } })); }
export const GET: APIRoute = ({ props, site }) => new Response(guideMarkdown(props.guide, site!.href), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
