import { test, expect } from '@playwright/test';
import { guides, guidePath, guideMarkdownPath } from '../../src/lib/guides';

test('指南免 JavaScript 可讀，來源、目錄、推薦及 Markdown 一致', async ({ browser, baseURL, request }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport });
  const page = await context.newPage();
  for (const guide of guides) {
    await page.goto(`${baseURL}${guidePath(guide)}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(guide.title);
    await expect(page.getByRole('navigation', { name: '本篇目錄' })).toBeVisible();
    await expect(page.locator('a[href$=".md"], a[href="/agents/"]')).toHaveCount(0);
    await expect(page.locator('link[rel="alternate"][type="text/markdown"]')).toHaveAttribute('href', guideMarkdownPath(guide));
    await page.getByRole('navigation', { name: '本篇目錄' }).getByRole('link').first().click();
    await expect(page.locator(`#${guide.sections[0].id}`)).toBeInViewport();
    const heading = await page.locator(`#${guide.sections[0].id} h2`).boundingBox();
    const header = await page.locator('.site-header').boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(data['@graph'][0].dateModified).toBe(guide.checkedAt);
    const referral = page.getByRole('link', { name: '使用 ether.fi 推薦連結（另開分頁）', exact: true });
    await expect(referral).toHaveAttribute('href', 'https://www.ether.fi/@65a6f169');
    await expect(referral).toHaveAttribute('rel', 'sponsored noopener noreferrer');
    const markdown = await request.get(guideMarkdownPath(guide));
    expect(markdown.ok()).toBe(true);
    expect(markdown.headers()['content-type']).toContain('text/markdown');
    const text = await markdown.text();
    for (const section of guide.sections) for (const paragraph of section.paragraphs) expect(text).toContain(paragraph);
    await expect(page.getByRole('heading', { name: '官方來源與查核範圍' })).toBeVisible();
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('guide-article.png'), fullPage: true });
  await context.close();
});

test('從主導覽到系列閱讀，Agent 目錄與未知路徑', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('navigation', { name: '主要導覽' }).getByRole('link', { name: '教學指南' }).click();
  await page.getByRole('link', { name: '查看系列與閱讀順序 →' }).click();
  await expect(page.locator('main ol > li')).toHaveCount(guides.length);
  await page.getByRole('link', { name: guides[0].title, exact: true }).click();
  await page.getByRole('navigation', { name: '系列閱讀順序' }).getByRole('link', { name: guides[1].title }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(guides[1].title);
  await expect(page.locator('a[href="/agents/"]')).toHaveCount(0);
  expect((await request.get('/agents/')).status()).toBe(404);
  const catalog = await (await request.get('/content-index.json')).json();
  expect(catalog.mcp.available).toBe(false);
  expect(catalog.guides).toHaveLength(guides.length);
  expect((await request.get('/guides/etherfi/not-a-guide/')).status()).toBe(404);
  expect(errors).toEqual([]);
});
