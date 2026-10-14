import { test, expect } from '@playwright/test';

test.describe('A01: 路由與導覽測試', () => {
  const routes = [
    { path: '/', title: 'Larry Lab' },
    { path: '/tools/', title: '工具總覽' },
    { path: '/tools/mortgage/', title: '房貸試算' },
    { path: '/tools/personal-loan/', title: '信貸試算' },
    { path: '/tools/stock-pledge/', title: '股票質押試算' },
    { path: '/tools/retirement/', title: '退休試算' },
    { path: '/tools/portfolio/', title: '投資組合試算' },
    { path: '/recommendations/', title: '推薦總覽' },
    { path: '/about/', title: '關於 Larry Lab' },
    { path: '/methodology/', title: '計算方法與模型說明' },
    { path: '/privacy/', title: '隱私說明與資料安全' },
  ];

  for (const r of routes) {
    test(`直接造訪深層路由與標題: ${r.path}`, async ({ page }) => {
      const response = await page.goto(r.path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(new RegExp(r.title));
      await expect(page.locator('a.brand')).toBeVisible();
    });
  }

  test('404 頁面與錯誤路由', async ({ page }) => {
    const response = await page.goto('/non-existent-page-12345/');
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toContainText('404');
    await expect(page.locator('a.brand')).toBeVisible();
    await expect(page.getByRole('link', { name: '返回 Larry Lab 首頁' })).toBeVisible();
  });
});

test.describe('A02 & A13: 推薦側欄、空狀態與利益揭露', () => {
  test('確認空狀態正確呈現且不遮蔽內容', async ({ page, isMobile }) => {
    await page.goto('/');
    if (isMobile) {
      const mobileRec = page.locator('[data-testid="rec-mobile"]');
      await expect(mobileRec).toBeVisible();
      await mobileRec.locator('summary').click();
      await expect(mobileRec.locator('[data-testid="rec-empty"]')).toContainText('推薦資訊整理中');
    } else {
      const desktopRec = page.locator('[data-testid="rec-aside"]');
      await expect(desktopRec).toBeVisible();
      await expect(desktopRec.locator('[data-testid="rec-empty"]')).toContainText('推薦資訊整理中');
    }
  });

  test('推薦總覽頁利益揭露完整性', async ({ page }) => {
    await page.goto('/recommendations/');
    await expect(page.locator('#disclosure')).toBeVisible();
    await expect(page.locator('#disclosure')).toContainText('透明原則');
  });
});

test.describe('A03–A07: 五大試算器互動、計算與圖表', () => {
  test('A03: 房貸試算器載入範例與自訂計算', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    const toolRoot = page.locator('#tool-root');
    await expect(toolRoot).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await expect(page.locator('#results-heading')).toContainText('試算結果');
    await expect(page.locator('.card-label', { hasText: '貸款本金' })).toBeVisible();
    await expect(page.locator('.chart-svg')).toBeVisible();
    await expect(page.locator('table caption', { hasText: '逐月攤還表' })).toBeVisible();
  });

  test('A04: 信貸試算器計算與現金流年化成本', async ({ page }) => {
    await page.goto('/tools/personal-loan/');
    const toolRoot = page.locator('#tool-root');
    await expect(toolRoot).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await expect(page.locator('.card-label', { hasText: '估算有效年化成本' })).toBeVisible();
  });

  test('A05: 股票質押試算器情境與門檻', async ({ page }) => {
    await page.goto('/tools/stock-pledge/');
    const toolRoot = page.locator('#tool-root');
    await expect(toolRoot).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await expect(page.locator('.card-label', { hasText: '目前簡化維持率' })).toBeVisible();
    await expect(page.locator('table caption', { hasText: '擔保品漲跌情境' })).toBeVisible();
  });

  test('A06: 退休試算器情境與單位切換', async ({ page }) => {
    await page.goto('/tools/retirement/');
    const toolRoot = page.locator('#tool-root');
    await expect(toolRoot).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await expect(page.locator('.card-label', { hasText: '今天退休所需本金' })).toBeVisible();
    await expect(page.locator('.card-label', { hasText: '目標年齡退休所需本金' })).toBeVisible();
    // 測試名目與購買力單位切換
    const unitSelect = page.locator('select[data-path="unit"]');
    await unitSelect.selectOption('nominal');
    await expect(page.locator('.card-label', { hasText: '未來名目金額' }).first()).toBeVisible();
  });

  test('A07: 投資組合試算器配置與累積切換', async ({ page }) => {
    await page.goto('/tools/portfolio/');
    const toolRoot = page.locator('#tool-root');
    await expect(toolRoot).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await expect(page.locator('.card-label', { hasText: /^總資產$/ })).toBeVisible();
    await expect(page.locator('.card-label', { hasText: /^槓桿倍數$/ })).toBeVisible();

    // 切換為累積模式
    const modeSelect = page.locator('select[data-path="mode"]');
    await modeSelect.selectOption('accumulation');
    await expect(page.locator('.card-label', { hasText: '累計投入' })).toBeVisible();
    await expect(page.locator('.card-label', { hasText: '預估期末價值' })).toBeVisible();
  });
});

test.describe('A08: 錯誤輸入、重設與資料管理', () => {
  test('房貸輸入錯誤時清除結果並顯示欄位提示', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    
    // 輸入負數或錯誤期數
    const termInput = page.locator('input[data-path="scenarios.0.termMonths"]');
    await termInput.fill('-10');
    await termInput.blur();
    await expect(page.locator('.field-error', { hasText: '貸款期數' })).toBeVisible();
    await expect(page.locator('.notice-bad')).toContainText('目前的輸入無法計算');
  });

  test('點擊重設按鈕清空所有欄位', async ({ page }) => {
    await page.goto('/tools/personal-loan/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await page.locator('button', { hasText: '重設' }).click();
    await expect(page.locator('.status')).toContainText('已清空所有欄位');
    await expect(page.locator('input[data-path="scenarios.0.principal"]')).toHaveValue('');
  });
});

test.describe('A10 & A11: 無障礙、安全標頭與隱私檢視', () => {
  test('確認安全標頭存在 (CSP, nosniff, frame-ancestors)', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers();
    expect(headers?.['x-content-type-options']).toBe('nosniff');
    expect(headers?.['x-frame-options']).toBe('DENY');
    expect(headers?.['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers?.['content-security-policy']).toBeDefined();
  });

  test('確認頁面鍵盤 Skip Link 可聚焦與跳轉', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a.skip-link');
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await skipLink.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });
});
