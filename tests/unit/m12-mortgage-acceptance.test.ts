import { describe, expect, it } from 'vitest';
import { mortgageTool } from '../../src/lib/tools/mortgage';
import { retirementTool } from '../../src/lib/tools/retirement';
import { loanTool } from '../../src/lib/tools/loan';
import { pledgeTool } from '../../src/lib/tools/pledge';
import { portfolioTool } from '../../src/lib/tools/portfolio';
import { toCsv } from '../../src/lib/csv';
import type { Values } from '../../src/lib/parse';

describe('M12 房貸改善計畫獨立算術與規格驗收 (M12-01 ~ M12-10)', () => {
  it('M12-01: 120,000／12期／0%／無寬限費用，本息與本金平均各測，各期10,000、利息0、12列、期末0，CSV相符', () => {
    // 1. 本息平均
    const evAnnuity = mortgageTool.evaluate(
      {
        name: 'M12-01 本息',
        inputMode: 'principal',
        principal: '120,000',
        termMonths: '12',
        fixedRate: '0',
        method: 'annuity',
        graceMonths: '0',
        fee: '0',
      },
      { scenarios: [] },
    );
    expect(evAnnuity.errors).toEqual({});
    const corePaymentAnnuity = evAnnuity.cards.find((c) => c.isCore && c.label.includes('月付'));
    expect(corePaymentAnnuity?.value).toBe('NT$10,000');
    expect(evAnnuity.cards.find((c) => c.label === '總利息支出')?.value).toBe('NT$0');
    expect(evAnnuity.cards.find((c) => c.label === '含費用總支出')?.value).toBe('NT$120,000');
    expect(evAnnuity.csv?.rows).toHaveLength(13); // 1 header + 12 months

    // 2. 本金平均
    const evEqual = mortgageTool.evaluate(
      {
        name: 'M12-01 本金',
        inputMode: 'principal',
        principal: '120,000',
        termMonths: '12',
        fixedRate: '0',
        method: 'equal-principal',
        graceMonths: '0',
        fee: '0',
      },
      { scenarios: [] },
    );
    expect(evEqual.errors).toEqual({});
    const corePaymentEqual = evEqual.cards.find((c) => c.isCore && c.label.includes('月付'));
    expect(corePaymentEqual?.value).toBe('NT$10,000');
    expect(evEqual.cards.find((c) => c.label === '總利息支出')?.value).toBe('NT$0');
    expect(evEqual.cards.find((c) => c.label === '含費用總支出')?.value).toBe('NT$120,000');

    // 驗證 CSV 內容
    const csvContent = toCsv(evEqual.csv!.rows);
    expect(csvContent).toContain('12,0,10000,0,10000,0');
  });

  it('M12-02: 120,000／12期／12%，本金平均：首期11,200、第7期10,600、末期10,100、總利息7,800；核心不得將10,600稱首期', () => {
    const ev = mortgageTool.evaluate(
      {
        name: 'M12-02',
        inputMode: 'principal',
        principal: '120,000',
        termMonths: '12',
        fixedRate: '12',
        method: 'equal-principal',
        graceMonths: '0',
        fee: '0',
      },
      { scenarios: [] },
    );
    expect(ev.errors).toEqual({});

    // 核心卡片呈現範圍，且不得單獨標 10,600 為首期
    const corePayment = ev.cards.find((c) => c.isCore && c.label.includes('月付'));
    expect(corePayment?.value).toContain('10,100');
    expect(corePayment?.value).toContain('11,200');

    // 次要首期卡片嚴格等於 11,200 (且 compareKey 嚴格為 firstPayment)
    const firstCard = ev.cards.find((c) => c.compareKey === 'firstPayment');
    expect(firstCard?.value).toBe('NT$11,200');

    // 最高月付卡片等於 11,200
    const maxCard = ev.cards.find((c) => c.label === '最高月付金');
    expect(maxCard?.value).toBe('NT$11,200');

    // 總利息支出嚴格等於 7,800
    const interestCard = ev.cards.find((c) => c.label === '總利息支出');
    expect(interestCard?.value).toBe('NT$7,800');
  });

  it('M12-03: 120,000／12期／12%，本息平均：固定月付 10,661.854641401、總利息 7,942.255696812；對齊 compareKey 不因標籤不同缺少比較', () => {
    const ev = mortgageTool.evaluate(
      {
        name: 'M12-03',
        inputMode: 'principal',
        principal: '120,000',
        termMonths: '12',
        fixedRate: '12',
        method: 'annuity',
        graceMonths: '0',
        fee: '0',
      },
      { scenarios: [] },
    );
    expect(ev.errors).toEqual({});

    const pmt = 120000 * 0.01 / (1 - Math.pow(1.01, -12));
    expect(pmt).toBeCloseTo(10661.854641401, 6);
    const totalInt = pmt * 12 - 120000;
    expect(totalInt).toBeCloseTo(7942.255696812, 6);

    const firstCard = ev.cards.find((c) => c.compareKey === 'firstPayment');
    expect(firstCard?.value).toBe('NT$10,662');
    expect(firstCard?.compareKey).toBe('firstPayment');
  });

  it('M12-04: 120,000／24期／0%／前12期寬限：前12期0，後12期10,000，利息0；時段摘要兩段；增加10,000且增幅標「不適用」不除零', () => {
    const ev = mortgageTool.evaluate(
      {
        name: 'M12-04',
        inputMode: 'principal',
        principal: '120,000',
        termMonths: '24',
        fixedRate: '0',
        method: 'annuity',
        graceMonths: '12',
        fee: '0',
      },
      { scenarios: [] },
    );
    expect(ev.errors).toEqual({});

    // 檢查時段摘要表格
    const periodTable = ev.tables.find((t) => t.caption === '還款時段摘要');
    expect(periodTable).toBeDefined();
    expect(periodTable?.rows).toHaveLength(2);
    // 第一段：第 1–12 個月，月付 0
    expect(periodTable?.rows[0][0]).toContain('第 1–12 個月');
    expect(periodTable?.rows[0][3]).toBe('NT$0');
    expect(periodTable?.rows[0][5]).toBe('NT$120,000');
    // 第二段：第 13–24 個月，月付 10,000
    expect(periodTable?.rows[1][0]).toContain('第 13–24 個月');
    expect(periodTable?.rows[1][3]).toBe('NT$10,000');
    expect(periodTable?.rows[1][5]).toBe('NT$0');

    // 增幅百分比標「不適用」
    expect(periodTable?.note).toContain('增加 NT$10,000');
    expect(periodTable?.note).toContain('增幅不適用');
  });

  it('M12-05: 120,000／24期／本息平均；1–12月0%、13–24月12%，無寬限：前12期5,000，第12期餘額60,000；第13期5,330.927320701', () => {
    const ev = mortgageTool.evaluate(
      {
        name: 'M12-05',
        inputMode: 'principal',
        principal: '120,000',
        termMonths: '24',
        method: 'annuity',
        graceMonths: '0',
        fee: '0',
        segments: [
          { startMonth: '1', annualRate: '0' },
          { startMonth: '13', annualRate: '12' },
        ],
      },
      { scenarios: [] },
    );
    expect(ev.errors).toEqual({});

    const pmt13 = 60000 * 0.01 / (1 - Math.pow(1.01, -12));
    expect(pmt13).toBeCloseTo(5330.927320701, 6);

    const periodTable = ev.tables.find((t) => t.caption === '還款時段摘要');
    expect(periodTable?.rows).toHaveLength(2);
    expect(periodTable?.rows[0][3]).toBe('NT$5,000');
    expect(periodTable?.rows[0][5]).toBe('NT$60,000');
    expect(periodTable?.rows[1][3]).toBe('NT$5,331');

    // 首期月付卡片為 5,000
    const firstCard = ev.cards.find((c) => c.label === '首期月付金');
    expect(firstCard?.value).toBe('NT$5,000');
  });

  it('M12-06: 原M12-05加前12期寬限：前12期0且第12期餘額120,000；第13期10,661.854641401；說明利率與攤還共同影響', () => {
    const ev = mortgageTool.evaluate(
      {
        name: 'M12-06',
        inputMode: 'principal',
        principal: '120,000',
        termMonths: '24',
        method: 'annuity',
        graceMonths: '12',
        fee: '0',
        segments: [
          { startMonth: '1', annualRate: '0' },
          { startMonth: '13', annualRate: '12' },
        ],
      },
      { scenarios: [] },
    );
    expect(ev.errors).toEqual({});

    const pmt13 = 120000 * 0.01 / (1 - Math.pow(1.01, -12));
    expect(pmt13).toBeCloseTo(10661.854641401, 6);

    const periodTable = ev.tables.find((t) => t.caption === '還款時段摘要');
    expect(periodTable?.rows).toHaveLength(2);
    expect(periodTable?.rows[0][3]).toBe('NT$0');
    expect(periodTable?.rows[0][5]).toBe('NT$120,000');
    expect(periodTable?.rows[1][3]).toBe('NT$10,662');

    // 說明利率與攤還共同影響
    expect(periodTable?.note).toContain('此差異同時包含利率變動與開始償還本金之共同影響');
  });

  it('M12-07: 30年(360月)與361月；非法寬限期(graceMonths >= termMonths)有明確錯誤；0利率合法，空白不可當0', () => {
    // 1. 寬限期等於期數 -> 報錯
    const evIllegalGrace = mortgageTool.evaluate(
      {
        inputMode: 'principal',
        principal: '100,000',
        termMonths: '12',
        graceMonths: '12',
        fixedRate: '2.0',
        method: 'annuity',
      },
      { scenarios: [] },
    );
    expect(evIllegalGrace.errors.graceMonths).toContain('寬限期必須短於總期數');

    // 2. 空白不可當 0
    const evBlankRate = mortgageTool.evaluate(
      {
        inputMode: 'principal',
        principal: '100,000',
        termMonths: '12',
        fixedRate: '',
        method: 'annuity',
      },
      { scenarios: [] },
    );
    expect(evBlankRate.errors.fixedRate).toBeDefined();

    // 3. 0% 利率合法
    const evZeroRate = mortgageTool.evaluate(
      {
        inputMode: 'principal',
        principal: '100,000',
        termMonths: '12',
        fixedRate: '0',
        method: 'annuity',
      },
      { scenarios: [] },
    );
    expect(evZeroRate.errors).toEqual({});
  });

  it('M12-08: 固定與分段模式使用 segments 為單一數據源，所有分段均在 compareInputs 揭露', () => {
    const sFixed = {
      name: '固定方案',
      inputMode: 'principal',
      principal: '1,000,000',
      termMonths: '240',
      fixedRate: '2.5',
      segments: [{ startMonth: '1', annualRate: '2.5' }],
    };
    const evFixed = mortgageTool.evaluate(sFixed, { scenarios: [] });
    const inputsFixed = mortgageTool.compareInputs!(sFixed, evFixed);
    const rateItemFixed = inputsFixed.find((i) => i.label === '利率設定');
    expect(rateItemFixed?.value).toContain('固定年利率 2.5%');

    const sSegmented = {
      name: '分段方案',
      inputMode: 'principal',
      principal: '1,000,000',
      termMonths: '240',
      segments: [
        { startMonth: '1', annualRate: '2.1' },
        { startMonth: '25', annualRate: '2.4' },
      ],
    };
    const evSegmented = mortgageTool.evaluate(sSegmented, { scenarios: [] });
    const inputsSegmented = mortgageTool.compareInputs!(sSegmented, evSegmented);
    const rateItemSeg = inputsSegmented.find((i) => i.label === '利率設定');
    expect(rateItemSeg?.value).toContain('第1段(1月起): 2.1%');
    expect(rateItemSeg?.value).toContain('第2段(25月起): 2.4%');
  });

  it('M12-09: 兩方案只改頭期款或成數，衍生貸款本金不同；compareInputs 及卡片正確呈現', () => {
    const s1 = {
      name: '方案 A',
      inputMode: 'price-down',
      price: '10,000,000',
      downPayment: '2,000,000',
      termMonths: '360',
      fixedRate: '2.2',
      method: 'annuity',
    };
    const s2 = {
      name: '方案 B',
      inputMode: 'price-down',
      price: '10,000,000',
      downPayment: '3,000,000',
      termMonths: '360',
      fixedRate: '2.2',
      method: 'annuity',
    };
    const ev1 = mortgageTool.evaluate(s1, { scenarios: [] });
    const ev2 = mortgageTool.evaluate(s2, { scenarios: [] });

    expect(ev1.cards.find((c) => c.compareKey === 'principal')?.value).toBe('NT$8,000,000');
    expect(ev2.cards.find((c) => c.compareKey === 'principal')?.value).toBe('NT$7,000,000');

    const inp1 = mortgageTool.compareInputs!(s1, ev1);
    const inp2 = mortgageTool.compareInputs!(s2, ev2);

    expect(inp1.find((i) => i.label === '衍生貸款本金')?.value).toBe('NT$8,000,000');
    expect(inp2.find((i) => i.label === '衍生貸款本金')?.value).toBe('NT$7,000,000');
  });

  it('M12-10: 五大工具 CSV 輸出定義完整驗收（特別包含退休工具 CSV）', () => {
    // 1. 房貸
    const m = mortgageTool.evaluate((mortgageTool.example().scenarios as Values[])[0], { scenarios: [] });
    expect(m.csv).toBeDefined();
    expect(m.csv?.filename).toBe('mortgage-schedule.csv');
    expect(m.csv?.rows.length).toBeGreaterThan(12);

    // 2. 信貸
    const l = loanTool.evaluate((loanTool.example().scenarios as Values[])[0], { scenarios: [] });
    expect(l.csv).toBeDefined();
    expect(l.csv?.filename).toBe('personal-loan-schedule.csv');

    // 3. 質押
    const p = pledgeTool.evaluate((pledgeTool.example().scenarios as Values[])[0], { scenarios: [] });
    expect(p.csv).toBeDefined();
    expect(p.csv?.filename).toBe('stock-pledge-scenarios.csv');

    // 4. 退休（重點：PR #4 回歸修復驗證）
    const r = retirementTool.evaluate((retirementTool.example().scenarios as Values[])[0], { unit: 'real', scenarios: [] });
    expect(r.csv).toBeDefined();
    expect(r.csv?.filename).toBe('retirement-projection.csv');
    expect(r.csv?.rows.length).toBeGreaterThan(1);
    expect(r.csv?.rows[0]).toEqual(['月份', '年齡（歲）', '階段', '資產（今天購買力，TWD）', '資產（未來名目，TWD）']);

    // 5. 投資組合
    const port = portfolioTool.evaluate((portfolioTool.example().scenarios as Values[])[0], { mode: 'allocation', scenarios: [] });
    expect(port.csv).toBeDefined();
    expect(port.csv?.filename).toBe('portfolio-allocation.csv');
  });
});
