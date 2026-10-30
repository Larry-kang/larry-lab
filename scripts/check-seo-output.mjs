import { readFileSync, existsSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = path => readFileSync(`dist/${path}`, 'utf8');
const content = JSON.parse(readFileSync('src/content/tool-content.json', 'utf8'));
const pageUpdates = JSON.parse(readFileSync('src/content/page-updates.json', 'utf8'));
const articleFiles = readdirSync('src/content/articles').filter(f => f.endsWith('.md'));
const articleSlugs = articleFiles.map(f => f.replace(/\.md$/, ''));
const isDraft = slug => /^status:\s*draft\s*$/m.test(readFileSync(`src/content/articles/${slug}.md`, 'utf8').split(/^---$/m)[1] ?? '');
const publishedSlugs = articleSlugs.filter(s => !isDraft(s));
// 已發布文章數 + 1 個系列索引頁（草稿不進 sitemap/llms；全為草稿時索引頁也排除）
const expectedPages = Object.keys(content).length + Object.keys(pageUpdates).length + (publishedSlugs.length ? publishedSlugs.length + 1 : 0);
const llms = read('llms.txt');
const sitemap = read('sitemap.xml');
assert.equal((sitemap.match(/<loc>/g) ?? []).length, expectedPages);
assert.equal((sitemap.match(/<lastmod>/g) ?? []).length, expectedPages);
assert(!/priority|changefreq|localhost/.test(sitemap));
const method = read('methodology/index.html');
for (const [id, item] of Object.entries(content)) {
  const path = `tools/${id}/`;
  const html = read(`${path}index.html`);
  assert(html.includes(item.assumptions), `${id} 靜態假設缺漏`);
  assert(html.includes(item.faqs[0].question), `${id} 靜態問答缺漏`);
  assert(method.includes(`id="${id}"`), `${id} 方法錨點缺漏`);
  assert(method.includes(item.assumptions), `${id} 方法摘要未同步`);
  assert(llms.includes(`https://larry-lab.pages.dev/${path}`), `${id} llms 路由缺漏`);
  const json = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  assert(json, `${id} JSON-LD 缺漏`);
  const graph = JSON.parse(json)['@graph'];
  assert.equal(graph[0]['@type'], 'WebApplication');
  assert.equal(graph[0].dateModified, item.updatedAt);
  assert(!JSON.stringify(graph).includes('aggregateRating'));
  assert(html.includes(`<title>${item.title}｜Larry Lab</title>`));
}
for (const slug of articleSlugs) {
  const html = read(`articles/${slug}/index.html`);
  const json = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  assert(json, `${slug} 文章 JSON-LD 缺漏`);
  assert.equal(JSON.parse(json)['@graph'][0]['@type'], 'Article');
  const url = `https://larry-lab.pages.dev/articles/${slug}/`;
  const noindex = html.includes('<meta name="robots" content="noindex, follow">');
  if (isDraft(slug)) {
    assert(noindex, `${slug} 草稿缺 noindex`);
    assert(!sitemap.includes(url), `${slug} 草稿不應進 sitemap`);
    assert(!llms.includes(url), `${slug} 草稿不應進 llms`);
  } else {
    assert(!noindex, `${slug} 已發布不應 noindex`);
    assert(sitemap.includes(url), `${slug} sitemap 缺漏`);
    assert(llms.includes(url), `${slug} llms 缺漏`);
  }
}
if (articleSlugs.length) {
  const seriesHtml = read('articles/etherfi/index.html');
  const seriesUrl = 'https://larry-lab.pages.dev/articles/etherfi/';
  const seriesIndexed = publishedSlugs.length > 0;
  assert.equal(!seriesHtml.includes('<meta name="robots" content="noindex, follow">'), seriesIndexed, '系列索引 noindex 狀態錯誤');
  assert.equal(sitemap.includes(seriesUrl), seriesIndexed, '系列索引 sitemap 狀態錯誤');
  assert.equal(llms.includes(seriesUrl), seriesIndexed, '系列索引 llms 狀態錯誤');
}
assert(read('index.html').includes('"@type":"WebSite"'));
assert(!read('404.html').includes('application/ld+json'));
for (const match of sitemap.matchAll(/<loc>https:\/\/larry-lab.pages.dev\/([^<]*)<\/loc>/g)) assert(existsSync(`dist/${match[1]}index.html`));
console.log(`SEO 靜態產物：PASS（工具正文、JSON-LD、方法錨點、llms 與 ${expectedPages} 條 sitemap）`);
