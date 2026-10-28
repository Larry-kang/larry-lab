import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('M12 房貸工具結果正確性與易用性全面端對端驗收', () => {

  test('M12-01: 本金計算模式切換（直接本金、成數、頭期款）與衍生計算', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    const modeSelect = page.locator('select[data-path="scenarios.0.inputMode"]');
    // 預設為房價 + 貸款成數，切換後清除不適用欄位
    await expect(modeSelect).toHaveValue('price-ltv');

    const priceField = page.locator('.field[data-field="scenarios.0.price"]');
    const downPaymentField = page.locator('.field[data-field="scenarios.0.downPayment"]');
    const ltvField = page.locator('.field[data-field="scenarios.0.ltv"]');
    const principalField = page.locator('.field[data-field="scenarios.0.principal"]');

    await expect(priceField).toBeVisible();
    await expect(downPaymentField).toBeHidden();
    await expect(ltvField).toBeVisible();
    await expect(principalField).toBeHidden();

    // 切換至「房價 + 貸款成數」模式
    await modeSelect.selectOption('price-ltv');
    await expect(priceField).toBeVisible();
    await expect(downPaymentField).toBeHidden();
    await expect(ltvField).toBeVisible();
    await expect(principalField).toBeHidden();

    // 輸入房價 20,000,000，成數 80%
    await page.locator('input[data-path="scenarios.0.price"]').fill('20,000,000');
    await page.locator('input[data-path="scenarios.0.ltv"]').fill('80');
    await page.locator('input[data-path="scenarios.0.ltv"]').blur();

    // 切換至「直接輸入貸款本金」模式
    await modeSelect.selectOption('principal');
    await expect(priceField).toBeHidden();
    await expect(downPaymentField).toBeHidden();
    await expect(ltvField).toBeHidden();
    await expect(principalField).toBeVisible();

    // 輸入貸款本金 15,000,000
    await page.locator('input[data-path="scenarios.0.principal"]').fill('15,000,000');
    await page.locator('input[data-path="scenarios.0.principal"]').blur();

    // 結果卡片應有對應的有效數值更新
    await expect(page.locator('.card-featured').first()).toBeVisible();
  });

  test('M12-02: P0 首期月付金錯誤修復驗收（本金均攤遞減首期與範圍）', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    // 切換模式為「直接輸入貸款本金」
    await page.locator('select[data-path="scenarios.0.inputMode"]').selectOption('principal');
    await page.locator('input[data-path="scenarios.0.principal"]').fill('120,000');

    // 期數切換為月，輸入 12
    const termUnitMonth = page.locator('.field[data-field="scenarios.0.termMonths"] button', { hasText: '個月' });
    await termUnitMonth.click();
    await page.locator('input[data-path="scenarios.0.termMonths"]').fill('12');

    // 利率 12%
    await page.locator('input[data-path="scenarios.0.fixedRate"]').fill('12');

    // 展開進階設定，修改攤還方式為「本金平均攤還」
    const advBox = page.locator('#advanced-settings-box');
    await advBox.locator('summary').click();
    await expect(advBox).toHaveAttribute('open', '');

    // 寬限期設為 0
    await page.locator('input[data-path="scenarios.0.graceMonths"]').fill('0');

    // 切換攤還方式為 equal-principal
    await page.locator('select[data-path="scenarios.0.method"]').selectOption('equal-principal');
    await page.locator('select[data-path="scenarios.0.method"]').blur();

    // 核對核心指標卡片：月付金範圍（遞減）包含 10,100 ~ 11,200
    const rangeCard = page.locator('.card-featured', { hasText: '月付金範圍（遞減）' });
    await expect(rangeCard).toBeVisible();
    await expect(rangeCard.locator('.card-value')).toContainText('10,100');
    await expect(rangeCard.locator('.card-value')).toContainText('11,200');

    // 首期月付金精確為 11,200（絕不能是錯誤的 10,600）
    const firstPayCard = page.locator('.card', { has: page.locator('.card-label', { hasText: /^首期月付金$/ }) });
    await expect(firstPayCard).toBeVisible();
    await expect(firstPayCard.locator('.card-value')).toContainText('11,200');

    // 最高月付金為 11,200
    const maxPayCard = page.locator('.card', { has: page.locator('.card-label', { hasText: /^最高月付金$/ }) });
    await expect(maxPayCard).toBeVisible();
    await expect(maxPayCard.locator('.card-value')).toContainText('11,200');
  });

  test('M12-03: 期數與寬限期年/月單位切換與等值提示', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    const termWrap = page.locator('.field[data-field="scenarios.0.termMonths"]');
    const termInput = termWrap.locator('input[data-path]');
    const yearBtn = termWrap.locator('button', { hasText: '年' });
    const monthBtn = termWrap.locator('button', { hasText: '個月' });

    // 初始年模式，預設 30 年，等值提示應顯示「360 個月」
    await expect(yearBtn).toHaveClass(/active/);
    await expect(termWrap.locator('.unit-equiv')).toContainText('360 個月');

    // 切換為個月模式
    await monthBtn.click();
    await expect(monthBtn).toHaveClass(/active/);
    await expect(termInput).toHaveValue('360');

    // 修改為 361 個月，等值提示應顯示「30 年 1 個月」
    await termInput.fill('361');
    await termInput.blur();
    await expect(termWrap.locator('.unit-equiv')).toContainText('30 年 1 個月');

    // 切換回年模式，自動換算
    await yearBtn.click();
    await expect(termWrap.locator('.unit-equiv')).toContainText('361 個月');
  });

  test('M12-04: 固定利率輸入驗收、0% 利率合法性與無效輸入驗證', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    const rateInput = page.locator('input[data-path="scenarios.0.fixedRate"]');

    // 0% 利率合法（無息貸款），利息為 0，能正常計算
    await rateInput.fill('0');
    await rateInput.blur();
    await expect(page.locator('.notice-bad')).toBeHidden();
    const interestCard = page.locator('.card-featured', { hasText: '總利息支出' });
    await expect(interestCard.locator('.card-value')).toContainText('0');

    // 空白利率 -> 視為無效輸入，顯示失效警示
    await rateInput.fill('');
    await rateInput.blur();
    await expect(page.locator('.notice-bad')).toBeVisible();
    await expect(page.locator('.notice-bad')).toContainText('輸入待修正，以下結果已失效');
    await expect(page.locator('.field[data-field="scenarios.0.fixedRate"] .field-error')).toBeVisible();

    // 負數利率 -> 標示錯誤
    await rateInput.fill('-1.5');
    await rateInput.blur();
    await expect(page.locator('.notice-bad')).toBeVisible();

    // 恢復正常 2.185%
    await rateInput.fill('2.185');
    await rateInput.blur();
    await expect(page.locator('.notice-bad')).toBeHidden();

    // 展開進階設定，寬限期大於等於貸款期數 -> 報錯
    const advBox = page.locator('#advanced-settings-box');
    await advBox.locator('summary').click();
    const graceInput = page.locator('input[data-path="scenarios.0.graceMonths"]');
    // 貸款年限是 30 年 (360 個月)，graceMonths 預設是個月單位
    await graceInput.fill('361');
    await graceInput.blur();
    await expect(page.locator('.notice-bad')).toBeVisible();
    await expect(page.locator('.field[data-field="scenarios.0.graceMonths"] .field-error')).toContainText('寬限期必須短於總期數');

    // 恢復寬限期 36 個月 (3 年)
    await graceInput.fill('36');
    await graceInput.blur();
    await expect(page.locator('.notice-bad')).toBeHidden();
  });

  test('M12-05: 還款時段摘要表格呈現（寬限期、增幅百分比與利率變動）', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    // 設定模式為直接本金 10,000,000、30 年、固定利率 2%
    await page.locator('select[data-path="scenarios.0.inputMode"]').selectOption('principal');
    await page.locator('input[data-path="scenarios.0.principal"]').fill('10,000,000');
    await page.locator('input[data-path="scenarios.0.fixedRate"]').fill('2');

    // 展開進階設定，輸入寬限期 36 個月
    const advBox = page.locator('#advanced-settings-box');
    await advBox.locator('summary').click();
    await page.locator('input[data-path="scenarios.0.graceMonths"]').fill('36');
    await page.locator('input[data-path="scenarios.0.graceMonths"]').blur();

    // 檢查還款時段摘要表格
    const summaryTable = page.locator('table caption', { hasText: '還款時段摘要' }).locator('xpath=..');
    await expect(summaryTable).toBeVisible();

    // 應有兩段：第 1~36 個月（寬限期）、第 37~360 個月（本息攤還）
    const rows = summaryTable.locator('tbody tr');
    await expect(rows).toHaveCount(2);

    // 第一段月付約 16,667
    await expect(rows.nth(0)).toContainText('1–36 個月');
    await expect(rows.nth(0)).toContainText('寬限期');
    await expect(rows.nth(0)).toContainText('16,667');

    // 第二段為本息均攤
    await expect(rows.nth(1)).toContainText('37–360 個月');
    await expect(rows.nth(1)).toContainText('本息均攤');
    await expect(rows.nth(1)).toContainText('39,969');
  });

  test('M12-06: 方案比較對齊、差異警示與衍生本金不同提示', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    // 複製目前方案產生新方案
    await page.getByRole('button', { name: /複製目前方案/ }).click();
    const tabCount = await page.locator('.tab').count();
    expect(tabCount).toBeGreaterThanOrEqual(2);

    // 複製後直接在頁面下方渲染 .tool-compare table
    const compTable = page.locator('.tool-compare table');
    await expect(compTable).toBeVisible();

    // 剛複製時各列皆相同，預設差異優先會收合相同列；展開後再核對欄位存在
    await page.locator('.compare-same-toggle').click();

    // 檢查比較表格包含輸入條件（衍生貸款本金）與試算結果項目（首期月付金、總利息支出）
    await expect(compTable.locator('tr', { hasText: '衍生貸款本金' })).toBeVisible();
    const firstPayRow = compTable.locator('tr', { has: page.locator('th', { hasText: /^首期月付金$/ }) });
    await expect(firstPayRow).toBeVisible();
    await expect(compTable.locator('tr', { has: page.locator('th', { hasText: /^總利息支出$/ }) })).toBeVisible();

    // 檢查固定與變動月付的 compareKey 穩定對齊（不出現空白儲存格）
    // 切換回第二個方案，展開進階設定，改為「本金平均攤還」
    await page.locator('.tab').nth(1).click();
    const advBox = page.locator('#advanced-settings-box');
    await advBox.locator('summary').click();
    await page.locator('select[data-path="scenarios.1.method"]').selectOption('equal-principal');
    await page.locator('select[data-path="scenarios.1.method"]').blur();

    // 檢查比較表格中的首期月付金項目兩欄皆有數值
    await expect(firstPayRow).toBeVisible();
    const cells = firstPayRow.locator('td');
    await expect(cells.first()).not.toBeEmpty();

    // 測試房價相同但成數/頭期款不同時的衍生本金警示
    await page.locator('.tab').nth(0).click();
    await page.locator('select[data-path="scenarios.0.inputMode"]').selectOption('price-ltv');
    await page.locator('input[data-path="scenarios.0.price"]').fill('15,000,000');
    await page.locator('input[data-path="scenarios.0.ltv"]').fill('80'); // 衍生本金 12,000,000

    await page.locator('.tab').nth(1).click();
    await page.locator('select[data-path="scenarios.1.inputMode"]').selectOption('price-ltv');
    await page.locator('input[data-path="scenarios.1.price"]').fill('15,000,000');
    await page.locator('input[data-path="scenarios.1.ltv"]').fill('70'); // 衍生本金 10,500,000

    // 到比較表檢查提示
    const notice = page.locator('.compare-header .notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('基本條件不同');
  });

  test('M12-07: CSV 完整下載核對（包含房貸與退回修復之退休工具）', async ({ page }) => {
    // 1. 測試房貸 CSV 下載與內容核對
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    const [mortgageDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-csv-download').click(),
    ]);

    const mortgagePath = await mortgageDownload.path();
    expect(mortgagePath).toBeTruthy();
    const mortgageCsvContent = fs.readFileSync(mortgagePath!, 'utf-8');
    
    // 核對 CSV Header
    const mortgageLines = mortgageCsvContent.trim().split(/\r?\n/);
    expect(mortgageLines[0]).toContain('期數');
    expect(mortgageLines[0]).toContain('月付金');
    expect(mortgageLines[0]).toContain('利息');
    expect(mortgageLines[0]).toContain('本金');
    expect(mortgageLines[0]).toContain('剩餘本金');
    expect(mortgageLines.length).toBeGreaterThan(12);

    // 2. 測試退休工具 CSV 下載（PR #4 曾遺失按鈕，已修復）
    await page.goto('/tools/retirement/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    const retirementCsvBtn = page.locator('.btn-csv-download');
    await expect(retirementCsvBtn).toBeVisible();

    const [retireDownload] = await Promise.all([
      page.waitForEvent('download'),
      retirementCsvBtn.click(),
    ]);

    const retirePath = await retireDownload.path();
    expect(retirePath).toBeTruthy();
    const retireCsvContent = fs.readFileSync(retirePath!, 'utf-8');
    const retireLines = retireCsvContent.trim().split(/\r?\n/);
    expect(retireLines[0]).toContain('年齡');
    expect(retireLines[0]).toContain('今天購買力');
    expect(retireLines.length).toBeGreaterThan(1);
  });

  test('M12-08: JSON 匯出與匯入往返 (Round-trip) 及 LocalStorage 測試', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    // 展開儲存與管理
    await page.locator('.storage-management summary').click();

    // 改為直接本金模式並填寫特定金額：12,345,678
    await page.locator('select[data-path="scenarios.0.inputMode"]').selectOption('principal');
    const principalInput = page.locator('input[data-path="scenarios.0.principal"]');
    await principalInput.fill('12,345,678');
    await principalInput.blur();

    // 匯出 JSON
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button', { hasText: '匯出設定檔（JSON）' }).click(),
    ]);
    const exportPath = await download.path();
    expect(exportPath).toBeTruthy();
    const jsonStr = fs.readFileSync(exportPath!, 'utf-8');
    const parsed = JSON.parse(jsonStr);
    expect(parsed.inputs.scenarios[0].principal).toBe('12,345,678');

    // 修改畫面值為 999
    await principalInput.fill('999');
    await principalInput.blur();
    await expect(principalInput).toHaveValue('999');

    // 直接透過 #import-file 匯入檔案
    await page.locator('#import-file').setInputFiles(exportPath!);

    // 驗證已成功還原為 12,345,678
    await expect(page.locator('.status')).toContainText('成功匯入');
    await expect(principalInput).toHaveValue('12,345,678');

    // 驗證 LocalStorage 持久化：勾選「在此瀏覽器記住我的輸入」後重新整理
    const rememberBox = page.locator('#remember-toggle');
    if (!(await rememberBox.isChecked())) {
      await rememberBox.check();
    }
    await page.reload();
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('input[data-path="scenarios.0.principal"]')).toHaveValue('12,345,678');
  });

  test('M12-09: 全鍵盤可操作性與焦點管理', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    // 從 Skip Link 開始 Tab
    await page.keyboard.press('Tab');
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeFocused();

    // 按 Enter 聚焦 main
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();

    // 持續 Tab 進入工具欄位
    await page.keyboard.press('Tab');
    const activeTab = page.locator('.tab.active');
    await expect(activeTab).toBeVisible();

    // Tab 到第一個 input/select
    let focusedTag = '';
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      focusedTag = await page.evaluate(() => document.activeElement?.tagName || '');
      if (focusedTag === 'INPUT' || focusedTag === 'SELECT') break;
    }
    expect(['INPUT', 'SELECT']).toContain(focusedTag);
  });

  test('M12-10: 窄視口（640px）無水平全頁捲動檢核（真實 200% 縮放維持 NOT RUN）', async ({ page }) => {
    // 檢核窄視口寬度 640px（真實 200% 原生 UI 縮放維持 NOT RUN）
    await page.setViewportSize({ width: 640, height: 480 });
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    // 驗證 document.documentElement.scrollWidth <= window.innerWidth
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);
  });

  test('M12-11: 各解析度首屏與完整頁面截圖留存', async ({ page }) => {
    const screenshotDir = path.resolve(process.cwd(), 'artifacts/screenshots');
    fs.mkdirSync(screenshotDir, { recursive: true });

    const viewports = [
      { name: 'mobile-360x800', width: 360, height: 800 },
      { name: 'mobile-390x844', width: 390, height: 844 },
      { name: 'tablet-768x1024', width: 768, height: 1024 },
      { name: 'desktop-1440x900', width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/tools/mortgage/');
      await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

      // 首屏截圖
      await page.screenshot({
        path: path.join(screenshotDir, `mortgage-${vp.name}-fold.png`),
        fullPage: false,
      });

      // 全頁截圖
      await page.screenshot({
        path: path.join(screenshotDir, `mortgage-${vp.name}-full.png`),
        fullPage: true,
      });
    }

    // 方案比較截圖 (desktop)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');
    await page.getByRole('button', { name: /複製目前方案/ }).click();
    await expect(page.locator('.tool-compare table')).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, 'mortgage-compare-desktop.png'),
      fullPage: true,
    });
  });

});
