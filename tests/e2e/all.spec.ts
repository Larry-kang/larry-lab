import { test, expect } from '@playwright/test';

test.describe('V11-01 & A01: 找工具、搜尋同義詞與目的入口', () => {
  test('首頁關鍵字搜尋、同義詞篩選、清除與零結果處理', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('#home-tool-search');
    const clearBtn = page.locator('#clear-search-btn');
    const cardItems = page.locator('.tool-card-item');

    // 初始狀態為 5 個工具
    await expect(cardItems.filter({ hasNot: page.locator('[hidden]') })).toHaveCount(5);

    // 搜尋「購屋」-> 篩選出房貸
    await searchInput.fill('購屋');
    await expect(cardItems.filter({ hasNot: page.locator('[hidden]') })).toHaveCount(1);
    await expect(page.locator('.tool-card-item[data-tool-id="mortgage"]')).toBeVisible();

    // 搜尋「FIRE」-> 篩選出退休
    await searchInput.fill('FIRE');
    await expect(cardItems.filter({ hasNot: page.locator('[hidden]') })).toHaveCount(1);
    await expect(page.locator('.tool-card-item[data-tool-id="retirement"]')).toBeVisible();

    // 搜尋不存在的詞 -> 零結果提示
    await searchInput.fill('無關關鍵字xyz999');
    await expect(cardItems.filter({ hasNot: page.locator('[hidden]') })).toHaveCount(0);
    await expect(page.locator('#search-zero-state')).toBeVisible();

    // 點擊清除按鈕 -> 恢復 5 個工具
    await clearBtn.click();
    await expect(cardItems.filter({ hasNot: page.locator('[hidden]') })).toHaveCount(5);
    await expect(searchInput).toHaveValue('');
  });

  test('首頁目的問句入口可正確跳轉', async ({ page }) => {
    await page.goto('/');
    const pledgeChip = page.getByRole('link', { name: '質押跌多少要注意？' });
    await expect(pledgeChip).toBeVisible();
    await pledgeChip.click();
    await expect(page).toHaveURL(/\/tools\/stock-pledge\/?/);
    await expect(page.locator('h1')).toContainText('股票質押試算');
  });

  test('工具總覽頁分類切換與關鍵字聯合篩選', async ({ page }) => {
    await page.goto('/tools/');
    const toolItems = page.locator('.tool-list-item');
    await expect(toolItems.filter({ hasNot: page.locator('[hidden]') })).toHaveCount(5);

    // 點擊「投資與退休」分類
    await page.getByRole('button', { name: /^投資與退休/ }).click();
    await expect(toolItems.filter({ hasNot: page.locator('[hidden]') })).toHaveCount(2);

    // 在該分類下搜尋「再平衡」-> 篩選出投資組合
    const searchInput = page.locator('#tools-search-input');
    await searchInput.fill('再平衡');
    await expect(toolItems.filter({ hasNot: page.locator('[hidden]') })).toHaveCount(1);
    await expect(page.locator('.tool-list-item[data-tool-id="portfolio"]')).toBeVisible();
  });
});

test.describe('V11-02 & A10: 首屏可見性與響應式排版', () => {
  test('手機尺寸工具頁首屏可見標題、用途與第一個基本輸入', async ({ page, isMobile }) => {
    if (!isMobile) return;
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    const h1 = page.locator('h1');
    const lead = page.locator('.lead');
    const firstInput = page.locator('.field input').first();

    await expect(h1).toBeInViewport();
    await expect(lead).toBeInViewport();
    await expect(firstInput).toBeInViewport();
  });

  test('桌機尺寸首屏可見基本輸入與範例結果核心指標', async ({ page, isMobile }) => {
    if (isMobile) return;
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    const firstInput = page.locator('.field input').first();
    const coreCards = page.locator('.card-featured');

    await expect(firstInput).toBeVisible();
    await expect(coreCards.first()).toBeVisible();
  });
});

test.describe('V11-03 & A08: 基本/進階折疊、輸入不失焦與無效標示', () => {
  test('進階設定折疊預設收合、展開後不丟值，錯誤時自動展開', async ({ page }) => {
    await page.goto('/tools/retirement/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    const advBox = page.locator('#advanced-settings-box');
    await expect(advBox).toBeVisible();
    await expect(advBox).not.toHaveAttribute('open', '');

    // 展開進階設定並修改通膨
    await advBox.locator('summary').click();
    await expect(advBox).toHaveAttribute('open', '');
    const infInput = page.locator('input[data-path="scenarios.0.inflation"]');
    await infInput.fill('4.5');

    // 收合
    await advBox.locator('summary').click();
    await expect(advBox).not.toHaveAttribute('open', '');

    // 再次展開，數值依然存在
    await advBox.locator('summary').click();
    await expect(infInput).toHaveValue('4.5');

    // 輸入無效通膨（例如 -5%）
    await infInput.fill('-5');
    await infInput.blur();
    await expect(page.locator('.notice-bad')).toContainText('輸入待修正，以下結果已失效');
    // 自動展開進階區塊
    await expect(advBox).toHaveAttribute('open', '');
  });
});

test.describe('V11-04–V11-09: 五大工具互動與核心結果', () => {
  test('V11-04: 房貸試算與 CSV 下載按鈕', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await expect(page.locator('#results-heading')).toContainText('試算結果');
    await expect(page.locator('.card-featured .card-label', { hasText: '總利息支出' })).toBeVisible();
    await expect(page.locator('.card-featured .card-label', { hasText: '含費用總支出' })).toBeVisible();
    await expect(page.locator('button', { hasText: /下載 CSV 明細/ })).toBeVisible();
  });

  test('V11-05: 信貸試算三項核心結果', async ({ page }) => {
    await page.goto('/tools/personal-loan/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await expect(page.locator('.card-featured .card-label', { hasText: '每月還款金額' })).toBeVisible();
    await expect(page.locator('.card-featured .card-label', { hasText: '估算有效年化成本' })).toBeVisible();
    await expect(page.locator('.card-featured .card-label', { hasText: '期初可用金額' })).toBeVisible();
  });

  test('V11-06: 股票質押維持率與情境明細', async ({ page }) => {
    await page.goto('/tools/stock-pledge/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await expect(page.locator('.card-featured .card-label', { hasText: '目前簡化維持率' })).toBeVisible();
    await expect(page.locator('.card-featured .card-label', { hasText: '到警示門檻跌幅' })).toBeVisible();
    await expect(page.locator('table caption', { hasText: '擔保品漲跌情境明細' })).toBeVisible();
  });

  test('V11-07 & V11-08: 退休試算預設單情境、三組載入與複製/同步', async ({ page }) => {
    await page.goto('/tools/retirement/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // 初次預設只有 1 個情境標籤
    const tabs = page.locator('.tab');
    await expect(tabs).toHaveCount(1);
    await expect(tabs.first()).toContainText('情境 A');
    await expect(tabs.first()).toContainText('年報酬 5%');

    // 點擊「載入三組報酬範例」
    await page.getByRole('button', { name: /載入三組報酬範例/ }).click();
    await expect(page.locator('.tab')).toHaveCount(3);
    await expect(page.locator('.tab').nth(1)).toContainText('7% 報酬');
    await expect(page.locator('.tab').nth(2)).toContainText('10% 報酬');

    // 點擊「複製目前情境」
    await page.goto('/tools/personal-loan/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await page.getByRole('button', { name: /複製目前方案/ }).click();
    await expect(page.locator('.tab')).toHaveCount(3);
  });

  test('V11-09: 投資組合配置與累積模式切換', async ({ page }) => {
    await page.goto('/tools/portfolio/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await expect(page.locator('.card-featured .card-label', { hasText: '總資產' })).toBeVisible();
    await expect(page.locator('.card-featured .card-label', { hasText: '淨值（實質資產）' })).toBeVisible();

    // 切換至累積模式
    const modeSelect = page.locator('select[data-path="mode"]');
    await modeSelect.selectOption('accumulation');
    await expect(page.locator('.card-featured .card-label', { hasText: '預估期末資產總值' })).toBeVisible();
    await expect(page.locator('.card-featured .card-label', { hasText: '累計總投入本金' })).toBeVisible();
  });
});

test.describe('V11-10: 儲存與設定管理 (Details, LocalStorage, Undo)', () => {
  test('儲存與管理收合區、清空重設與復原 Undo', async ({ page }) => {
    await page.goto('/tools/personal-loan/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    const storageBox = page.locator('.storage-management');
    await expect(storageBox).toBeVisible();
    await expect(storageBox).not.toHaveAttribute('open', '');

    // 展開儲存與管理
    await storageBox.locator('summary').click();
    await expect(storageBox).toHaveAttribute('open', '');

    const principalInput = page.locator('input[data-path="scenarios.0.principal"]');
    await principalInput.fill('888,000');

    // 點擊清空重設
    await page.locator('button', { hasText: '清空重設' }).click();
    await expect(page.locator('.status')).toContainText('已清空所有欄位');
    await expect(principalInput).toHaveValue('');

    // 點擊復原重設 (Undo)
    await page.locator('button', { hasText: '復原重設 (Undo)' }).click();
    await expect(principalInput).toHaveValue('888,000');
  });

  test('複製工具網址為純網址，不含輸入金額', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await page.locator('.storage-management summary').click();
    await page.locator('button', { hasText: '複製工具網址' }).click();
    await expect(page.locator('.status')).toContainText('已複製工具網址');
  });
});

test.describe('V11-13 & A11: 隱私安全與 Cloudflare Pages 標頭驗證', () => {
  test('確認安全標頭已自 dist/_headers 套用 (CSP, nosniff, frame-ancestors)', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers();
    expect(headers?.['x-content-type-options']).toBe('nosniff');
    expect(headers?.['x-frame-options']).toBe('DENY');
    expect(headers?.['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers?.['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  test('確認隱私說明明確指出 LocalStorage 為未經加密純文字 JSON', async ({ page }) => {
    await page.goto('/privacy/');
    await expect(page.locator('body')).toContainText('未經加密的純文字 JSON 格式');
    await expect(page.locator('body')).not.toContainText('加密存放在你個人瀏覽器');
  });
});

test.describe('V11-14 & A01: 完整路由導覽與 404', () => {
  const routes = [
    { path: '/', title: 'Larry Lab' },
    { path: '/tools/', title: '工具大全' },
    { path: '/tools/mortgage/', title: '房貸試算' },
    { path: '/tools/personal-loan/', title: '信貸試算' },
    { path: '/tools/stock-pledge/', title: '股票質押試算' },
    { path: '/tools/retirement/', title: '退休試算' },
    { path: '/tools/portfolio/', title: '投資組合試算' },
    { path: '/recommendations/', title: '推薦優惠' },
    { path: '/about/', title: '關於 Larry Lab' },
    { path: '/methodology/', title: '計算方法與模型說明' },
    { path: '/privacy/', title: '隱私說明與資料安全' },
  ];

  for (const r of routes) {
    test(`路由建置與標題檢核: ${r.path}`, async ({ page }) => {
      const response = await page.goto(r.path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(new RegExp(r.title));
    });
  }

  test('404 錯誤頁面', async ({ page }) => {
    const response = await page.goto('/unknown-page-test-404/');
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toContainText('404');
    await expect(page.getByRole('link', { name: '返回 Larry Lab 首頁' })).toBeVisible();
  });
});
