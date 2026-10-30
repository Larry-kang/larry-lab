import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const recs = JSON.parse(readFileSync('src/content/recommendations.json', 'utf8')).items as { id: string; referralUrl?: string }[];
const etherfi = recs.find(r => r.id === 'ether-fi')!;
const slugs = ['first-crypto-basics', 'what-is-etherfi', 'etherfi-cash-card-guide'];

test('三篇文章可開啟並含目錄、待補、來源與揭露', async ({ page }) => {
  for (const slug of slugs) {
    const res = await page.goto(`/articles/${slug}/`);
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId('article-toc')).toBeVisible();
    await expect(page.locator('.article-body')).toContainText('待補');
    await expect(page.getByTestId('article-sources').locator('a').first()).toHaveAttribute('href', /^https:\/\//);
    await expect(page.getByTestId('article-disclosure')).toContainText('不保證收益');
    await expect(page.getByTestId('article-pager')).toBeVisible();
  }
});

test('ether.fi 推薦按鈕取自 recommendations.json', async ({ page }) => {
  await page.goto('/articles/what-is-etherfi/');
  const link = page.getByTestId('article-rec-link');
  await expect(link).toHaveAttribute('href', etherfi.referralUrl!);
  await expect(link).toHaveAttribute('rel', 'sponsored noopener noreferrer');
});

test('推薦總覽 ether.fi 卡片有「閱讀介紹」', async ({ page }) => {
  await page.goto('/recommendations/');
  const intro = page.locator('li.rec-card[data-rec-id="ether-fi"]').getByTestId('rec-intro-link');
  await expect(intro).toHaveText('閱讀介紹');
  await expect(intro).toHaveAttribute('href', '/articles/what-is-etherfi/');
});

test('系列索引頁列出三篇', async ({ page }) => {
  await page.goto('/articles/etherfi/');
  await expect(page.getByTestId('series-list').locator('li')).toHaveCount(3);
});
