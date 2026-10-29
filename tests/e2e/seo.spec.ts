import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { tools } from '../../src/config/site';

const articleFiles = readdirSync('src/content/articles').filter(f => f.endsWith('.md'));
const isDraft = (f: string) => /^status:\s*draft\s*$/m.test(readFileSync(`src/content/articles/${f}`, 'utf8').split(/^---$/m)[1] ?? '');
const draftSlugs = articleFiles.filter(isDraft).map(f => f.replace(/\.md$/, ''));
const publishedCount = articleFiles.length - draftSlugs.length;

test('SEO 靜態內容：停用 JavaScript 仍有五工具說明、問答與 JSON-LD', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const id of ['mortgage', 'personal-loan', 'stock-pledge', 'retirement', 'portfolio']) {
    await page.goto(`${baseURL}/tools/${id}/`);
    const section = page.locator(`[data-tool-explanation="${id}"]`);
    await expect(section.getByRole('heading', { name: '計算假設與限制' })).toBeVisible();
    await expect(section.getByRole('heading', { name: '常見問題' })).toBeVisible();
    await section.locator('summary').first().click();
    await expect(section.locator('details[open] p')).toBeVisible();
    const json = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(json['@graph'][0]['@type']).toBe('WebApplication');
    expect(json['@graph'][0].url).toBe(`https://larry-lab.pages.dev/tools/${id}/`);
    await page.goto(`${baseURL}/methodology/#${id}`);
    await expect(page.locator(`section[id="${id}"]`)).toBeVisible();
  }
  await context.close();
});

test('SEO 文件與公開路由一致，重整工具仍可操作', async ({ page, request }, testInfo) => {
  const llms = await request.get('/llms.txt');
  expect(llms.status()).toBe(200);
  expect(await llms.text()).toContain('/tools/mortgage/');
  const xml = await request.get('/sitemap.xml');
  expect((await xml.text()).match(/<lastmod>/g)).toHaveLength(tools.length + 6 + (publishedCount ? publishedCount + 1 : 0));
  await page.goto('/tools/mortgage/');
  await page.reload();
  await expect(page.getByLabel('房價（新台幣元）', { exact: true })).toBeVisible();
  await expect(page.locator('#tool-root')).toContainText('NT$36,451');
  await page.locator('[data-tool-explanation="mortgage"]').screenshot({ path: testInfo.outputPath('seo-explanation.png') });
});

test('草稿文章 noindex, follow 且不進 sitemap / llms.txt', async ({ page, request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const llms = await (await request.get('/llms.txt')).text();
  for (const slug of draftSlugs) {
    await page.goto(`/articles/${slug}/`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
    expect(sitemap).not.toContain(`/articles/${slug}/`);
    expect(llms).not.toContain(`/articles/${slug}/`);
  }
  await page.goto('/articles/etherfi/');
  const robots = page.locator('meta[name="robots"]');
  if (publishedCount) { await expect(robots).toHaveCount(0); expect(sitemap).toContain('/articles/etherfi/'); }
  else { await expect(robots).toHaveAttribute('content', 'noindex, follow'); expect(sitemap).not.toContain('/articles/etherfi/'); expect(llms).not.toContain('/articles/etherfi/'); }
});
