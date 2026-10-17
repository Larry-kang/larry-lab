import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 符合 RFC 4180 標準的 CSV 解析器，支援雙引號、包含逗號的欄位、轉義雙引號及 UTF-8 BOM。
 */
function parseCsv(csvText: string): string[][] {
  const text = csvText.startsWith('\uFEFF') ? csvText.slice(1) : csvText;
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((r) => r.length > 0 && !(r.length === 1 && r[0] === ''));
}

test.describe('M12 缺陷修正與補齊驗收缺口專用測試套件', () => {

  test('M12-FIX-01: 固定／分段利率資料一致性（5% 利率畫面、徽章、比較表、計算及匯出全數同步）', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    // 初始狀態：方案 1 利率 2.2%，核心月付 NT$36,451，頁籤徽章為「年利率 2.2%」
    const tab0 = page.locator('.tab').first();
    await expect(tab0.locator('.tab-badge')).toContainText('2.2%');

    // 修改固定年利率為 5%
    const rateInput = page.locator('input[data-path="scenarios.0.fixedRate"]');
    await rateInput.fill('5');
    await rateInput.blur();

    // 等待 300ms 防抖更新
    await page.waitForTimeout(300);

    // 1. 核心月付金更新為約 NT$51,535
    const coreCard = page.locator('.card-featured').first();
    await expect(coreCard.locator('.card-value')).toContainText('51,535');

    // 2. 頁籤徽章必須同步顯示「年利率 5%」（絕不能停留在 2.2%）
    await expect(tab0.locator('.tab-badge')).toContainText('年利率 5%');

    // 3. 展開進階設定，首段利率輸入框亦同步為 5
    const advBox = page.locator('#advanced-settings-box');
    await advBox.locator('summary').click();
    const seg0Input = page.locator('input[data-path="scenarios.0.segments.0.annualRate"]');
    await expect(seg0Input).toHaveValue('5');

    // 4. 反向同步：於進階首段修改為 3.5%，固定年利率輸入框與徽章同步為 3.5%
    await seg0Input.fill('3.5');
    await seg0Input.blur();
    await page.waitForTimeout(300);

    await expect(tab0.locator('.tab-badge')).toContainText('3.5%');
    await expect(rateInput).toHaveValue('3.5');

    // 5. 複製方案產生比較表，核對比較表利率設定為「固定年利率 3.5%」
    await page.getByRole('button', { name: /複製目前方案/ }).click();
    const compTable = page.locator('.tool-compare table');
    await expect(compTable).toBeVisible();

    const rateRow = compTable.locator('tr', { has: page.locator('th', { hasText: '利率設定' }) });
    await expect(rateRow).toBeVisible();
    await expect(rateRow.locator('td').first()).toContainText('固定年利率 3.5%');

    const screenshotDir = path.resolve(process.cwd(), 'artifacts/screenshots');
    fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, 'm12-fix-01-rate-sync.png') });
  });

  test('M12-FIX-02: 比較表指標明確對齊（首期、最高、月付範圍、寬限後首期獨立，方案2首期嚴格顯示 NT$16,000）', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    // 方案 2 為預設範例（寬限期 24 個月）
    // 比較表預設已在雙方案存在時展示
    const compTable = page.locator('.tool-compare table');
    await expect(compTable).toBeVisible();

    // 切換至方案 2（預設範例：寬限期 24 個月）
    const tab2 = page.locator('.tab').nth(1);
    await tab2.click();

    // 檢查方案 2 在單一方案視圖下的首期月付金卡片為 NT$16,000
    const singleFirstPayCard = page.locator('.card', { has: page.locator('.card-label', { hasText: /^首期月付金$/ }) });
    await expect(singleFirstPayCard.locator('.card-value')).toContainText('16,000');

    // 檢查方案比較表（.tool-compare table）各指標獨立對齊：
    // 1. 首期月付金列：方案 1 為 NT$36,451，方案 2 必須為 NT$16,000（絕不可為 16,000 ~ 39,203）
    const firstPayRow = compTable.locator('tr', { has: page.locator('th', { hasText: /^首期月付金$/ }) });
    await expect(firstPayRow).toBeVisible();
    const firstPayCells = firstPayRow.locator('td');
    await expect(firstPayCells.nth(0)).toContainText('36,451');
    await expect(firstPayCells.nth(1)).toContainText('16,000');
    await expect(firstPayCells.nth(1)).not.toContainText('~');

    // 2. 最高月付金列：方案 1 為 NT$36,451，方案 2 為 NT$39,203 (第 37 個月升息後)
    const maxPayRow = compTable.locator('tr', { has: page.locator('th', { hasText: /^最高月付金$/ }) });
    await expect(maxPayRow).toBeVisible();
    await expect(maxPayRow.locator('td').nth(1)).toContainText('39,203');

    // 3. 月付金範圍列：方案 1 為 固定 NT$36,451，方案 2 為 NT$16,000 ~ NT$39,203
    const rangeRow = compTable.locator('tr', { has: page.locator('th', { hasText: /^月付金範圍$/ }) });
    await expect(rangeRow).toBeVisible();
    await expect(rangeRow.locator('td').nth(0)).toContainText('固定');
    await expect(rangeRow.locator('td').nth(1)).toContainText('16,000');
    await expect(rangeRow.locator('td').nth(1)).toContainText('39,203');

    // 4. 寬限期後首期月付金列：方案 1 為「無寬限期」，方案 2 第 25 期為 NT$37,337
    const postGraceRow = compTable.locator('tr', { has: page.locator('th', { hasText: /^寬限期後首期月付金$/ }) });
    await expect(postGraceRow).toBeVisible();
    await expect(postGraceRow.locator('td').nth(0)).toContainText('無寬限期');
    await expect(postGraceRow.locator('td').nth(1)).toContainText('37,337');

    const screenshotDir = path.resolve(process.cwd(), 'artifacts/screenshots');
    await page.screenshot({ path: path.join(screenshotDir, 'm12-fix-02-compare-keys.png') });
  });

  test('M12-FIX-03: 舊版單段 JSON 匯入還原與衝突拒絕驗收（相容舊單段無錯誤，衝突檔拒絕且不覆寫目前設定）', async ({ page }) => {
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    // 展開儲存與管理
    await page.locator('.storage-management summary').click();

    // 1. 測試真正的舊版單段 JSON (只有 segments，沒有 fixedRate)
    const tmpDir = path.resolve(process.cwd(), 'artifacts/tmp');
    fs.mkdirSync(tmpDir, { recursive: true });

    const legacyJsonPath = path.join(tmpDir, 'legacy-single-segment.json');
    fs.writeFileSync(
      legacyJsonPath,
      JSON.stringify({
        schemaVersion: 1,
        toolId: 'mortgage',
        inputs: {
          scenarios: [
            {
              name: '舊版真實單段方案',
              inputMode: 'price-down',
              price: '12,000,000',
              downPayment: '2,400,000',
              termMonths: '360',
              method: 'annuity',
              graceMonths: '0',
              fee: '15,000',
              monthlyIncome: '120,000',
              otherMonthlyDebt: '0',
              segments: [{ startMonth: '1', annualRate: '2.2' }],
            },
          ],
        },
      }),
      'utf-8',
    );

    await page.locator('#import-file').setInputFiles(legacyJsonPath);
    await expect(page.locator('.status')).toContainText('成功匯入');

    // 驗證未被判「請輸入固定年利率」，結果完全有效
    await expect(page.locator('.notice-bad')).toBeHidden();
    const coreCard = page.locator('.card-featured').first();
    await expect(coreCard.locator('.card-value')).toContainText('36,451');

    // 2. 測試衝突檔案：fixedRate 與 segments[0].annualRate 衝突 (5% vs 2.2%)
    const conflictJsonPath = path.join(tmpDir, 'conflict-rates.json');
    fs.writeFileSync(
      conflictJsonPath,
      JSON.stringify({
        schemaVersion: 1,
        toolId: 'mortgage',
        inputs: {
          scenarios: [
            {
              name: '衝突利率方案',
              inputMode: 'price-down',
              price: '12,000,000',
              downPayment: '2,400,000',
              termMonths: '360',
              fixedRate: '5.0',
              segments: [{ startMonth: '1', annualRate: '2.2' }],
            },
          ],
        },
      }),
      'utf-8',
    );

    await page.locator('#import-file').setInputFiles(conflictJsonPath);
    // 應顯示錯誤且不覆寫目前設定
    await expect(page.locator('.status')).toContainText('設定衝突，未覆寫目前設定');
    // 目前畫面依然保持先前匯入的 36,451 (2.2% 利率)，未被篡改
    await expect(coreCard.locator('.card-value')).toContainText('36,451');
  });

  test('RETIREMENT-COMPARE-01: 退休工具方案比較揭露驗收（終止年齡、通膨率、年金收入等條件完整列出並標註不同）', async ({ page }) => {
    await page.goto('/tools/retirement/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    // 複製情境以產生多情境比較表
    await page.getByRole('button', { name: /複製目前情境/ }).click();
    const compTable = page.locator('.tool-compare table');
    await expect(compTable).toBeVisible();

    // 驗證比較表中已完整揭露終止年齡、通膨率、年金收入等輸入條件
    await expect(compTable.locator('tr', { hasText: '目前年齡' })).toBeVisible();
    await expect(compTable.locator('tr', { hasText: '目標退休年齡' })).toBeVisible();
    await expect(compTable.locator('tr', { hasText: '規劃終止年齡' })).toBeVisible();
    await expect(compTable.locator('tr', { hasText: '預估年通膨率' })).toBeVisible();
    await expect(compTable.locator('tr', { hasText: '其他退休月收入' })).toBeVisible();
    await expect(compTable.locator('tr', { hasText: '月收入開始領取年齡' })).toBeVisible();

    // 切換至情境 B，修改終止年齡與通膨率
    await page.locator('.tab').nth(1).click();
    const endAgeInput = page.locator('input[data-path="scenarios.1.endAge"]');
    await endAgeInput.fill('85');
    await endAgeInput.blur();

    // 展開進階設定修改通膨率
    const advBox = page.locator('#advanced-settings-box');
    await advBox.locator('summary').click();
    const infInput = page.locator('input[data-path="scenarios.1.inflation"]');
    await infInput.fill('2.5');
    await infInput.blur();
    await page.waitForTimeout(300);

    // 核對比較表中「規劃終止年齡」列具有 diff-tag（不同）標記
    const endAgeRow = compTable.locator('tr', { has: page.locator('th', { hasText: '規劃終止年齡' }) });
    await expect(endAgeRow).toHaveClass(/compare-row-diff/);
    await expect(endAgeRow.locator('.diff-tag')).toContainText('不同');

    const screenshotDir = path.resolve(process.cwd(), 'artifacts/screenshots');
    await page.screenshot({ path: path.join(screenshotDir, 'retirement-compare-disclosure.png') });
  });

  test('CSV-DEEP-ALL5: 五工具 CSV 嚴格數值與 RFC 4180 解析驗證（本金加總、利息加總、末期餘額為0、退休月份與年齡）', async ({ page }) => {
    // 1. 房貸工具 CSV 下載與精確數值加總檢核
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    const [mortgageDl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-csv-download').click(),
    ]);
    const mortgageCsv = fs.readFileSync((await mortgageDl.path())!, 'utf-8');
    const mortgageRows = parseCsv(mortgageCsv);

    // 標題欄檢核
    expect(mortgageRows[0]).toEqual(['期數', '年利率（小數）', '月付金（TWD）', '利息（TWD）', '償還本金（TWD）', '剩餘本金（TWD）']);
    // 列數：360 期 + 1 標題 = 361 列
    expect(mortgageRows.length).toBe(361);

    // 逐期數值解析與加總驗證
    let sumPrincipal = 0;
    let sumInterest = 0;
    for (let i = 1; i < mortgageRows.length; i++) {
      const row = mortgageRows[i];
      expect(Number(row[0])).toBe(i);
      sumInterest += Number(row[3]);
      sumPrincipal += Number(row[4]);
    }
    // 貸款本金為 9,600,000 元（12,000,000 - 2,400,000，360 期四捨五入殘差容許 < 0.5 元）
    expect(sumPrincipal).toBeCloseTo(9600000, 0);
    // 總利息支出為 3,522,461 元
    expect(sumInterest).toBeCloseTo(3522461.05, 1);
    // 末期剩餘本金嚴格為 0
    expect(Number(mortgageRows[360][5])).toBe(0);

    // 2. 信貸工具 CSV 檢核
    await page.goto('/tools/personal-loan/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');
    const [loanDl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-csv-download').click(),
    ]);
    const loanCsv = fs.readFileSync((await loanDl.path())!, 'utf-8');
    const loanRows = parseCsv(loanCsv);
    expect(loanRows[0]).toEqual(['期數', '年利率（小數）', '月付金（TWD）', '利息（TWD）', '償還本金（TWD）', '剩餘本金（TWD）']);
    expect(loanRows.length).toBe(61); // 60 期 + 1 標題
    let loanPrincipal = 0;
    for (let i = 1; i < loanRows.length; i++) {
      loanPrincipal += Number(loanRows[i][4]);
    }
    expect(loanPrincipal).toBeCloseTo(500000, 0);
    expect(Number(loanRows[60][5])).toBe(0);

    // 3. 質押工具 CSV 檢核（以已知虛構案例嚴格核對情境、維持率、市值與追加擔保品）
    await page.goto('/tools/stock-pledge/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');
    const [pledgeDl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-csv-download').click(),
    ]);
    const pledgeCsv = fs.readFileSync((await pledgeDl.path())!, 'utf-8');
    const pledgeRows = parseCsv(pledgeCsv);
    expect(pledgeRows[0]).toEqual(['情境', '漲跌幅（小數）', '擔保品市值（TWD）', '維持率（小數）', '淨值（TWD）', '現金還款至目標（TWD）', '追加合格證券至目標（TWD）']);
    // 預設 5 種情境（-10%, -20%, -30%, -50%, 自訂 -40%）+ 1 標題 = 6 列
    expect(pledgeRows.length).toBe(6);
    // 情境 1 (-10%): 市值 900,000，維持率 1.5，淨值 300,000，追加擔保品 96,000（文字以 - 開頭具備防公式注入之單引號轉義）
    expect(pledgeRows[1][0]).toBe("'-10%");
    expect(Number(pledgeRows[1][1])).toBeCloseTo(-0.1, 4);
    expect(Number(pledgeRows[1][2])).toBe(900000);
    expect(Number(pledgeRows[1][3])).toBeCloseTo(1.5, 4);
    expect(Number(pledgeRows[1][4])).toBe(300000);
    expect(Number(pledgeRows[1][6])).toBe(96000);
    // 情境 2 (-20%): 市值 800,000，維持率 1.3333，淨值 200,000，追加擔保品 196,000
    expect(pledgeRows[2][0]).toBe("'-20%");
    expect(Number(pledgeRows[2][2])).toBe(800000);
    expect(Number(pledgeRows[2][3])).toBeCloseTo(800000 / 600000, 4);
    expect(Number(pledgeRows[2][4])).toBe(200000);
    expect(Number(pledgeRows[2][6])).toBe(196000);
    // 情境 3 (-30%): 跌破 1.3 警示，市值 700,000，維持率 1.1667，淨值 100,000，追加擔保品 296,000
    expect(pledgeRows[3][0]).toBe("'-30%");
    expect(Number(pledgeRows[3][2])).toBe(700000);
    expect(Number(pledgeRows[3][3])).toBeCloseTo(700000 / 600000, 4);
    expect(Number(pledgeRows[3][4])).toBe(100000);
    expect(Number(pledgeRows[3][6])).toBe(296000);
    // 情境 4 (-50%): 市值 500,000，維持率 0.8333，淨值 -100,000，追加擔保品 496,000
    expect(pledgeRows[4][0]).toBe("'-50%");
    expect(Number(pledgeRows[4][2])).toBe(500000);
    expect(Number(pledgeRows[4][3])).toBeCloseTo(500000 / 600000, 4);
    expect(Number(pledgeRows[4][4])).toBe(-100000);
    expect(Number(pledgeRows[4][6])).toBe(496000);
    // 情境 5 (自訂 -40%): 市值 600,000，維持率 1.0，淨值 0，追加擔保品 396,000（中文開頭無單引號）
    expect(pledgeRows[5][0]).toBe('自訂 -40%');
    expect(Number(pledgeRows[5][2])).toBe(600000);
    expect(Number(pledgeRows[5][3])).toBeCloseTo(1.0, 4);
    expect(Number(pledgeRows[5][4])).toBe(0);
    expect(Number(pledgeRows[5][6])).toBe(396000);

    // 4. 投資組合 CSV 檢核（配置與壓力測試模式 + 長期資產累積模式 雙模式獨立驗證）
    await page.goto('/tools/portfolio/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    // 4a. 配置與壓力測試模式 CSV
    const [portAllocDl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-csv-download').click(),
    ]);
    const portAllocCsv = fs.readFileSync((await portAllocDl.path())!, 'utf-8');
    const portAllocRows = parseCsv(portAllocCsv);
    expect(portAllocRows[0]).toEqual(['資產名稱', '資產分類', '目前金額（TWD）', '權重（小數）', '漲跌幅（小數）', '漲跌後金額（TWD）']);
    // 預設 3 筆資產 + 1 標題 = 4 列
    expect(portAllocRows.length).toBe(4);
    // 資產 1：股票 600k，權重 0.6，跌 20%，衝擊後 480k
    expect(portAllocRows[1][0]).toBe('範例股票基金');
    expect(portAllocRows[1][1]).toBe('股票');
    expect(Number(portAllocRows[1][2])).toBe(600000);
    expect(Number(portAllocRows[1][3])).toBeCloseTo(0.6, 2);
    expect(Number(portAllocRows[1][4])).toBeCloseTo(-0.2, 2);
    expect(Number(portAllocRows[1][5])).toBe(480000);
    // 資產 2：債券 300k，權重 0.3，跌 5%，衝擊後 285k
    expect(portAllocRows[2][0]).toBe('範例債券基金');
    expect(portAllocRows[2][1]).toBe('債券');
    expect(Number(portAllocRows[2][2])).toBe(300000);
    expect(Number(portAllocRows[2][3])).toBeCloseTo(0.3, 2);
    expect(Number(portAllocRows[2][4])).toBeCloseTo(-0.05, 2);
    expect(Number(portAllocRows[2][5])).toBe(285000);
    // 資產 3：現金 100k，權重 0.1，跌 0%，衝擊後 100k
    expect(portAllocRows[3][0]).toBe('範例現金');
    expect(portAllocRows[3][1]).toBe('現金');
    expect(Number(portAllocRows[3][2])).toBe(100000);
    expect(Number(portAllocRows[3][3])).toBeCloseTo(0.1, 2);
    expect(Number(portAllocRows[3][4])).toBe(0);
    expect(Number(portAllocRows[3][5])).toBe(100000);

    // 4b. 切換至長期資產累積模式並下載預設情境 CSV
    const modeSelect = page.locator('select[data-path="mode"]');
    await modeSelect.selectOption('accumulation');
    await page.waitForTimeout(300);

    const [portAccDl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-csv-download').click(),
    ]);
    const portAccCsv = fs.readFileSync((await portAccDl.path())!, 'utf-8');
    const portAccRows = parseCsv(portAccCsv);
    expect(portAccRows[0]).toEqual(['年份', '累計投入（TWD）', '期末價值（TWD）', '累計收益（TWD）']);
    // 預設 20 年累積：第 0 年至第 20 年共 21 個年份點 + 1 標題 = 22 列
    expect(portAccRows.length).toBe(22);
    // 第 0 年：投入 500,000，期末價值 500,000，收益 0
    expect(Number(portAccRows[1][0])).toBe(0);
    expect(Number(portAccRows[1][1])).toBe(500000);
    expect(Number(portAccRows[1][2])).toBe(500000);
    expect(Number(portAccRows[1][3])).toBe(0);
    // 第 20 年：投入 500,000 + 20,000 * 12 * 20 = 5,300,000
    expect(Number(portAccRows[21][0])).toBe(20);
    expect(Number(portAccRows[21][1])).toBe(5300000);
    const finalVal = Number(portAccRows[21][2]);
    const finalGain = Number(portAccRows[21][3]);
    expect(finalVal).toBeGreaterThan(5300000);
    expect(finalGain).toBeCloseTo(finalVal - 5300000, 0);

    // 4c. 補強：累積模式零報酬、可手算 CSV 案例 (W=120k, C=1k, Y=2, r=0%)
    // 展開儲存與管理匯入獨立手算案例
    await page.locator('.storage-management summary').click();
    const tmpDir = path.resolve(process.cwd(), 'artifacts/tmp');
    fs.mkdirSync(tmpDir, { recursive: true });

    const zeroAccJsonPath = path.join(tmpDir, 'zero-accumulation.json');
    fs.writeFileSync(
      zeroAccJsonPath,
      JSON.stringify({
        schemaVersion: 1,
        toolId: 'portfolio',
        inputs: {
          mode: 'accumulation',
          scenarios: [
            {
              name: '零報酬可手算方案',
              initial: '120,000',
              monthlyContribution: '1,000',
              years: '2',
              accAssets: [
                { name: '資產A', weight: '50', annualReturn: '0' },
                { name: '資產B', weight: '50', annualReturn: '0' },
              ],
            },
          ],
        },
      }),
      'utf-8',
    );
    await page.locator('#import-file').setInputFiles(zeroAccJsonPath);
    await expect(page.locator('.status')).toContainText('成功匯入');
    await page.waitForTimeout(300);

    const [zeroAccDl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-csv-download').click(),
    ]);
    const zeroAccCsv = fs.readFileSync((await zeroAccDl.path())!, 'utf-8');
    const zeroAccRows = parseCsv(zeroAccCsv);
    expect(zeroAccRows.length).toBe(4); // 標題 + 第 0, 1, 2 年
    // Year 0: 120,000 / 120,000 / 0
    expect(zeroAccRows[1]).toEqual(['0', '120000', '120000', '0']);
    // Year 1: 120,000 + 1,000 * 12 = 132,000 / 132,000 / 0
    expect(zeroAccRows[2]).toEqual(['1', '132000', '132000', '0']);
    // Year 2: 120,000 + 1,000 * 24 = 144,000 / 144,000 / 0
    expect(zeroAccRows[3]).toEqual(['2', '144000', '144000', '0']);

    // 4d. 補強：累積模式正報酬、依計算契約獨立推導終值 CSV 案例 (W=100k, C=0, Y=2, r=12%)
    const posAccJsonPath = path.join(tmpDir, 'positive-accumulation.json');
    fs.writeFileSync(
      posAccJsonPath,
      JSON.stringify({
        schemaVersion: 1,
        toolId: 'portfolio',
        inputs: {
          mode: 'accumulation',
          scenarios: [
            {
              name: '契約正報酬推導方案',
              initial: '100,000',
              monthlyContribution: '0',
              years: '2',
              accAssets: [{ name: '單一資產', weight: '100', annualReturn: '12' }],
            },
          ],
        },
      }),
      'utf-8',
    );
    await page.locator('#import-file').setInputFiles(posAccJsonPath);
    await expect(page.locator('.status')).toContainText('成功匯入');
    await page.waitForTimeout(300);

    const [posAccDl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-csv-download').click(),
    ]);
    const posAccCsv = fs.readFileSync((await posAccDl.path())!, 'utf-8');
    const posAccRows = parseCsv(posAccCsv);
    expect(posAccRows.length).toBe(4);
    // Year 0: 100,000 / 100,000 / 0
    expect(posAccRows[1]).toEqual(['0', '100000', '100000', '0']);
    // Year 1 (契約第 175 行: 100,000 * 1.12 = 112,000): 100,000 / 112,000 / 12,000
    expect(posAccRows[2]).toEqual(['1', '100000', '112000', '12000']);
    // Year 2 (契約獨立推導: 112,000 * 1.12 = 125,440): 100,000 / 125,440 / 25,440
    expect(posAccRows[3]).toEqual(['2', '100000', '125440', '25440']);

    // 5. 退休工具 CSV 檢核（含預設情境與既有零報酬案例關鍵月份與資產值核對）
    await page.goto('/tools/retirement/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');
    const [retireDl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-csv-download').click(),
    ]);
    const retireCsv = fs.readFileSync((await retireDl.path())!, 'utf-8');
    const retireRows = parseCsv(retireCsv);
    expect(retireRows[0]).toEqual(['月份', '年齡（歲）', '階段', '資產（今天購買力，TWD）', '資產（未來名目，TWD）']);
    // 預設 35 歲至 90 歲規劃：含第 0 個月初始點共 661 個模擬點 + 1 標題 = 662 列
    expect(retireRows.length).toBe(662);
    expect(Number(retireRows[1][0])).toBe(0);
    expect(Number(retireRows[1][1])).toBe(35);
    expect(Number(retireRows[661][0])).toBe(660);
    for (let i = 1; i < retireRows.length; i++) {
      expect(Number.isFinite(Number(retireRows[i][3]))).toBe(true);
      expect(Number.isFinite(Number(retireRows[i][4]))).toBe(true);
    }

    // 5b. 補強：退休 CSV 採用既有零報酬案例 (契約第 134 行: A=59, R=60, H=61, W=60k, C=5k, E=10k, r=0, p=0)
    await page.locator('.storage-management summary').click();
    const retireZeroJsonPath = path.join(tmpDir, 'retire-zero-return.json');
    fs.writeFileSync(
      retireZeroJsonPath,
      JSON.stringify({
        schemaVersion: 1,
        toolId: 'retirement',
        inputs: {
          scenarios: [
            {
              name: '零報酬既有案例',
              currentAge: '59',
              retireAge: '60',
              endAge: '61',
              assets: '60,000',
              monthlyContribution: '5,000',
              monthlySpending: '10,000',
              monthlyIncome: '0',
              inflation: '0',
              returnBefore: '0',
              returnAfter: '0',
            },
          ],
        },
      }),
      'utf-8',
    );
    await page.locator('#import-file').setInputFiles(retireZeroJsonPath);
    await expect(page.locator('.status')).toContainText('成功匯入');
    await page.waitForTimeout(300);

    const [retireZeroDl] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-csv-download').click(),
    ]);
    const retireZeroCsv = fs.readFileSync((await retireZeroDl.path())!, 'utf-8');
    const retireZeroRows = parseCsv(retireZeroCsv);
    // 共 24 個月 + 初始點 = 25 筆數據 + 1 標題 = 26 列
    expect(retireZeroRows.length).toBe(26);
    // 月份 0 (期初): 60,000 / 60,000
    expect(retireZeroRows[1]).toEqual(['0', '59', '累積期', '60000', '60000']);
    // 月份 6 (工作第 6 個月): 60,000 + 6 * 5,000 = 90,000
    expect(retireZeroRows[7]).toEqual(['6', '59', '累積期', '90000', '90000']);
    // 月份 12 (退休時點): 60,000 + 12 * 5,000 = 120,000
    expect(retireZeroRows[13]).toEqual(['12', '59', '累積期', '120000', '120000']);
    // 月份 13 (退休後首月): 120,000 - 10,000 = 110,000
    expect(retireZeroRows[14]).toEqual(['13', '60', '退休期', '110000', '110000']);
    // 月份 18 (退休第 6 個月): 120,000 - 6 * 10,000 = 60,000
    expect(retireZeroRows[19]).toEqual(['18', '60', '退休期', '60000', '60000']);
    // 月份 24 (規劃終期): 120,000 - 12 * 10,000 = 0
    expect(retireZeroRows[25]).toEqual(['24', '60', '退休期', '0', '0']);
  });

  test('FOLD-CORE-VERIFY: 首屏物理視口範圍驗證（初始未捲動 scrollY=0 下三項核心指標及標籤在視口內）', async ({ page }) => {
    // 1. 桌機 1440x900 檢驗
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    // 嚴格在任何點擊、聚焦或捲動之前驗證 scrollY = 0
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);

    // 初始首屏：第一個基本輸入欄位位於視口內
    const firstInputDesktop = page.locator('select[data-path="scenarios.0.inputMode"]');
    await expect(firstInputDesktop).toBeInViewport();

    // 初始首屏未捲動：三項核心重點指標卡片物理位於 900px 視口內
    const featuredCards = page.locator('.card-featured');
    await expect(featuredCards).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      const card = featuredCards.nth(i);
      await expect(card).toBeInViewport();
      await expect(card.locator('.card-label')).toBeInViewport();
      await expect(card.locator('.card-value')).toBeInViewport();
    }

    // 儲存未捲動桌機首屏截圖
    const screenshotDir = path.resolve(process.cwd(), 'artifacts/screenshots');
    fs.mkdirSync(path.join(screenshotDir, 'desktop'), { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, 'desktop/tool-mortgage-initial-fold.png') });

    // 2. 手機 360x800 首屏檢驗
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    const mobileScrollY = await page.evaluate(() => window.scrollY);
    expect(mobileScrollY).toBe(0);

    // 首個基本輸入欄位（本金計算模式 select）在未捲動情況下必須位於視口 800px 內
    const firstInput = page.locator('select[data-path="scenarios.0.inputMode"]');
    await expect(firstInput).toBeInViewport();

    fs.mkdirSync(path.join(screenshotDir, 'mobile'), { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, 'mobile/tool-mortgage-initial-fold.png') });
  });

  test('CALC-BUTTON-SCROLL-VERIFY: 查看結果按鈕之捲動與焦點行為另設獨立驗證', async ({ page }) => {
    // 在手機尺寸（360x800，堆疊版型）下，點擊「查看試算結果 ↓」
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/tools/mortgage/');
    await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

    // 點擊「查看試算結果 ↓」以捲動至結果區塊
    const calcBtn = page.locator('.btn-calc');
    await expect(calcBtn).toBeVisible();
    await calcBtn.click();
    await page.waitForTimeout(500);

    // 驗證頁面產生實質捲動且結果標題在視口內並聚焦
    const afterScrollY = await page.evaluate(() => window.scrollY);
    expect(afterScrollY).toBeGreaterThan(0);
    const resultsHeading = page.locator('#results-heading');
    await expect(resultsHeading).toBeInViewport();
    await expect(resultsHeading).toBeFocused();
  });

  test('ZOOM-VIEWPORT-VERIFY: 各解析度視口無橫向捲動檢核與真實縮放標記說明', async ({ page }) => {
    const viewports = [
      { name: '360x800', width: 360, height: 800 },
      { name: '390x844', width: 390, height: 844 },
      { name: '768x1024', width: 768, height: 1024 },
      { name: '1440x900', width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/tools/mortgage/');
      await expect(page.locator('#tool-root')).toHaveAttribute('data-ready', 'true');

      // 檢查水平無捲軸溢出
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasOverflow).toBe(false);
    }
  });

});
