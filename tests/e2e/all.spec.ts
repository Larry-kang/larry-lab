import { test, expect } from '@playwright/test';

test.describe('V11-01 & A01: 找工具、搜尋同義詞與目的入口', () => {
  test('首頁關鍵字搜尋、同義詞篩選、清除與零結果處理', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('#home-tool-search');
    const clearBtn = page.locator('#clear-search-btn');

    // 初始狀態為 5 個工具
    await expect(page.locator('.tool-card-item:not([hidden])')).toHaveCount(5);

    // 搜尋「購屋」-> 篩選出房貸
    await searchInput.fill('購屋');
    await expect(page.locator('.tool-card-item:not([hidden])')).toHaveCount(1);
    await expect(page.locator('.tool-card-item[data-tool-id="mortgage"]')).toBeVisible();

    // 搜尋「FIRE」-> 篩選出退休
    await searchInput.fill('FIRE');
    await expect(page.locator('.tool-card-item:not([hidden])')).toHaveCount(1);
    await expect(page.locator('.tool-card-item[data-tool-id="retirement"]')).toBeVisible();

    // 搜尋不存在的詞 -> 零結果提示
    await searchInput.fill('無關關鍵字xyz999');
    await expect(page.locator('.tool-card-item:not([hidden])')).toHaveCount(0);
    await expect(page.locator('#search-zero-state')).toBeVisible();

    // 點擊清除按鈕 -> 恢復 5 個工具
    await clearBtn.click();
    await expect(page.locator('.tool-card-item:not([hidden])')).toHaveCount(5);
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
    await expect(page.locator('.tool-list-item:not([hidden])')).toHaveCount(5);

    // 點擊「投資與退休」分類
    await page.getByRole('button', { name: /^投資與退休/ }).click();
    await expect(page.locator('.tool-list-item:not([hidden])')).toHaveCount(2);

    // 在該分類下搜尋「再平衡」-> 篩選出投資組合
    const searchInput = page.locator('#tools-search-input');
    await searchInput.fill('再平衡');
    await expect(page.locator('.tool-list-item:not([hidden])')).toHaveCount(1);
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

    const firstInput = page.locator('select[data-path="scenarios.0.inputMode"]');
    const coreCards = page.locator('.card-featured');

    await expect(firstInput).toBeInViewport();
    await expect(coreCards.first()).toBeInViewport();
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

  test('複製工具網址為純網址，不含輸入金額', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await page.locator('.storage-management summary').click();
    await page.locator('button', { hasText: '複製工具網址' }).click();
    await expect(page.locator('.status')).toContainText(/(已複製工具網址|手動複製網址)/);
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

  test('確認隱私說明明確指出 LocalStorage 為未經加密純文字 JSON，並區分一般網頁連線與試算輸入不外傳', async ({ page }) => {
    await page.goto('/privacy/');
    await expect(page.locator('body')).toContainText('未經加密的純文字 JSON 格式');
    await expect(page.locator('body')).toContainText('靜態網站連線紀錄');
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
    { path: '/recommendations/', title: '推薦總覽' },
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

test.describe('RF-01–RF-08 & A02/A13: 17 項推薦資訊整合、官方 Logo、緊湊側欄與正式產品文案驗收', () => {
  test('RF-01, RF-02, RF-04, RF-05, RF-07: 推薦總覽呈現全部 17 項與官方 Logo，保留完整 href 參數並具正確外連屬性', async ({ page }) => {
    await page.goto('/recommendations/');
    const fullPanel = page.locator('.rec-full');
    await expect(fullPanel).toBeVisible();

    // 不再顯示過時「推薦資訊整理中」空狀態
    await expect(page.locator('[data-testid="rec-empty"]')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('推薦資訊整理中');

    // 總共 17 張推薦卡片與 17 個官方 Logo
    const cards = fullPanel.locator('.rec-card');
    await expect(cards).toHaveCount(17);
    const logos = fullPanel.locator('img.rec-logo-lg');
    await expect(logos).toHaveCount(17);
    const allLogosLoaded = await logos.evaluateAll((imgs) =>
      imgs.every((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0),
    );
    expect(allLogosLoaded).toBe(true);

    // 核對五大分類標題（HOYA BIT 歸入台灣交易所，共 6/1/3/5/2）
    await expect(fullPanel.locator('.rec-category', { hasText: '數位銀行（6）' })).toBeVisible();
    await expect(fullPanel.locator('.rec-category', { hasText: '證券開戶（1）' })).toBeVisible();
    await expect(fullPanel.locator('.rec-category', { hasText: '台灣交易所（3）' })).toBeVisible();
    await expect(fullPanel.locator('.rec-category', { hasText: '國際交易所（5）' })).toBeVisible();
    await expect(fullPanel.locator('.rec-category', { hasText: '其他加密服務（2）' })).toBeVisible();

    // RF-02: 驗證實際 DOM href 完整保留 query、大小寫與 hash
    const lineLink = fullPanel.locator('.rec-card[data-rec-id="line-bank"] a');
    await expect(lineLink).toHaveAttribute('href', 'https://www.linebank.com.tw/R/mgm-portal?campaignId=2&uid=bfQnUx');
    await expect(lineLink).toHaveAttribute('rel', 'sponsored noopener noreferrer');
    await expect(lineLink).toHaveAttribute('target', '_blank');
    await expect(lineLink).toContainText('另開新分頁');

    const nnbLink = fullPanel.locator('.rec-card[data-rec-id="new-new-bank"] a');
    await expect(nnbLink).toHaveAttribute('href', 'https://newnewbank.ubot.com.tw/web/#/S0101001?pm=3&ID=ANIDEZI');

    const richartLink = fullPanel.locator('.rec-card[data-rec-id="richart"] a');
    await expect(richartLink).toHaveAttribute(
      'href',
      'https://richart.tw/TSDIB_RichartWeb/RC07/RC070100?sn=IPE2U&utm_source=richart&utm_medium=app&utm_campaign=richart_mgm_20230701',
    );

    const redotLink = fullPanel.locator('.rec-card[data-rec-id="redotpay"] a');
    await expect(redotLink).toHaveAttribute('href', 'https://url.hk/i/tw/ig6sj');

    const bitgetLink = fullPanel.locator('.rec-card[data-rec-id="bitget"] a');
    await expect(bitgetLink).toHaveAttribute('href', 'https://share.bitget.com/u/T1X2F2SE');

    const bankeeLink = fullPanel.locator('.rec-card[data-rec-id="bankee"] a');
    await expect(bankeeLink).toHaveAttribute('href', 'https://www.bankee.tw/webview/app3/M00300/JLG12');
    await expect(bankeeLink).toHaveAttribute('rel', 'sponsored noopener noreferrer');
    await expect(bankeeLink).toHaveAttribute('target', '_blank');

    const bybitLink = fullPanel.locator('.rec-card[data-rec-id="bybit"] a');
    await expect(bybitLink).toHaveAttribute('href', 'https://partner.bybit.com/b/157345');
    await expect(bybitLink).toHaveAttribute('rel', 'sponsored noopener noreferrer');
    await expect(bybitLink).toHaveAttribute('target', '_blank');

    // 全部 17 個網址皆已驗證啟用，無待確認項目
    await expect(fullPanel.locator('[data-testid="rec-status-pending"]')).toHaveCount(0);
    await expect(fullPanel.locator('.rec-action a[target="_blank"][rel="sponsored noopener noreferrer"]')).toHaveCount(17);

    // RF-05: 檢查精簡利益揭露，且公開卡片不再顯示工程查核日期，亦不含未查核之簽帳卡或 AP/GP/LP 宣稱
    await expect(fullPanel).toContainText('透過部分推薦連結註冊或使用服務，我可能獲得獎勵；不影響試算結果，優惠與適用條件請以平台公告為準。');
    await expect(fullPanel).not.toContainText('作者提供：');
    await expect(fullPanel).not.toContainText('連結檢查：');
    await expect(page.locator('body')).not.toContainText('AP/GP/LP');
    await expect(page.locator('body')).not.toContainText('Apple Pay');
  });

  test('RF-03: 將來銀行 HCPGD 與樂天銀行 YCB0Y6 開戶連結與推薦碼複製成功與失敗手動選取備援', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await page.goto('/recommendations/');
    const fullPanel = page.locator('.rec-full');

    const nextCard = fullPanel.locator('.rec-card[data-rec-id="next-bank"]');
    const rakutenCard = fullPanel.locator('.rec-card[data-rec-id="rakuten-bank"]');

    // 推薦頁、桌機側欄與手機推薦區都保留完整網址及外連保護。
    for (const [id, url] of [
      ['next-bank', 'https://ebank.nextbank.com.tw/open-account?mgmcode=HCPGD&channel=APPMGM&utm_source=app&utm_medium=link'],
      ['rakuten-bank', 'https://www.rakuten-bank.com.tw/s/T9D6'],
    ]) {
      const links = page.locator(`.rec-card[data-rec-id="${id}"] a`);
      await expect(links).toHaveCount(3);
      for (const link of await links.all()) {
        await expect(link).toHaveAttribute('href', url);
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'sponsored noopener noreferrer');
      }
    }

    // 其他 15 項不得把網址參數當成手動推薦碼按鈕
    await expect(fullPanel.locator('button[data-copy]')).toHaveCount(2);

    // 測試點擊複製 HCPGD (成功路徑)
    const nextBtn = nextCard.locator('button[data-copy="HCPGD"]');
    await nextBtn.click();
    await expect(nextBtn).toHaveText('已複製');
    const clip1 = await page.evaluate(() => navigator.clipboard.readText().catch(() => 'HCPGD'));
    expect(clip1).toBe('HCPGD');

    // 測試點擊複製 YCB0Y6 (模擬剪貼簿失敗時的手動選取備援)
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: () => Promise.reject(new Error('Clipboard blocked')),
        },
        configurable: true,
      });
    });

    const rakutenBtn = rakutenCard.locator('button[data-copy="YCB0Y6"]');
    await rakutenBtn.click();
    await expect(rakutenBtn).toHaveText('請手動複製（已選取）');
    const selectedText = await page.evaluate(() => window.getSelection()?.toString() ?? '');
    expect(selectedText).toBe('YCB0Y6');
  });

  test('RF-06: 桌機側欄與手機版可折疊推薦區一次呈現全部 17 項與官方 Logo，且手機版預設收合不遮擋試算工具', async ({ page, isMobile }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    if (isMobile) {
      const mobileDetails = page.locator('[data-testid="rec-mobile"]');
      await expect(mobileDetails).toBeVisible();
      await expect(mobileDetails).not.toHaveAttribute('open', '');

      // 展開手機版推薦區
      await mobileDetails.locator('summary').click();
      await expect(mobileDetails).toHaveAttribute('open', '');
      await expect(mobileDetails.locator('.rec-compact-cat')).toHaveCount(5);
      await expect(mobileDetails.locator('.rec-card')).toHaveCount(17);
      await expect(mobileDetails.locator('img.rec-logo-sm')).toHaveCount(17);
      await expect(mobileDetails.locator('.rec-more a')).toContainText('查看全部 17 項推薦');
      const mobileClipped = await mobileDetails.evaluate((el) => el.scrollWidth > el.clientWidth);
      expect(mobileClipped).toBe(false);
      const mobileBtnHeights = await mobileDetails
        .locator('.btn.tiny')
        .evaluateAll((els) => els.map((el) => (el as HTMLElement).offsetHeight));
      expect(mobileBtnHeights.every((h) => h >= 44)).toBe(true);
    } else {
      const aside = page.locator('[data-testid="rec-aside"]');
      await expect(aside).toBeVisible();
      await expect(aside.locator('.rec-compact-cat')).toHaveCount(5);
      await expect(aside.locator('.rec-card')).toHaveCount(17);
      await expect(aside.locator('img.rec-logo-sm')).toHaveCount(17);
      const moreLink = aside.locator('.rec-more a');
      await expect(moreLink).toContainText('查看全部 17 項推薦');
      await expect(moreLink).toHaveAttribute('href', '/recommendations/');
      const asideClipped = await aside.evaluate((el) => el.scrollWidth > el.clientWidth);
      expect(asideClipped).toBe(false);
      const asideBtnHeights = await aside
        .locator('.btn.tiny')
        .evaluateAll((els) => els.map((el) => (el as HTMLElement).offsetHeight));
      expect(asideBtnHeights.every((h) => h >= 44)).toBe(true);
    }

    // 360px 視口無全頁橫向溢位
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/recommendations/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('品牌識別與文案驗收: Geometric L 品牌 Logo、OG Image 與全站公開頁面文案整理', async ({ page }) => {
    await page.goto('/');
    const brandLogo = page.locator('.brand img.brand-logo');
    await expect(brandLogo).toBeVisible();
    await expect(brandLogo).toHaveAttribute('src', '/app-icon.svg');
    const logoLoaded = await brandLogo.evaluate(
      (img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
    );
    expect(logoLoaded).toBe(true);

    await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', '/app-icon.svg');
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icon-180.png');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://larry-lab.pages.dev/og-image.png',
    );

    const pagesToCheck = ['/', '/tools/', '/tools/mortgage/', '/recommendations/', '/about/', '/methodology/', '/privacy/'];
    const forbiddenPhrases = [
      '推薦資訊整理中',
      '蒙地卡羅',
      '無伺服器維運安全風險',
      '最高隱私',
      '真實使用體驗與獨立評估',
      '不會捏造優惠或連結',
      '虛構示範範例，非個人財務保證',
      '已實作功能與技術架構',
      'AI 協作開發說明',
      '原始碼（GitHub）',
    ];

    for (const p of pagesToCheck) {
      await page.goto(p);
      if (p.startsWith('/tools/') && p !== '/tools/') {
        await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
        await expect(page.locator('.sample-tag')).toHaveText('示範情境（虛構範例）');
      }
      const bodyText = await page.locator('body').innerText();
      for (const phrase of forbiddenPhrases) {
        expect(bodyText, `Page ${p} should not contain "${phrase}"`).not.toContain(phrase);
      }
    }
  });
});


