import { describe, expect, it } from 'vitest';
import { mortgageTool } from '../../src/lib/tools/mortgage';
import { parseImport } from '../../src/lib/io';
import { schemaOf } from '../../src/lib/ui/schema';
import type { Values } from '../../src/lib/parse';

describe('三項已重現缺陷測試 (Defects 1, 2, 3 Reproduction)', () => {
  it('Defect 1: 固定／分段利率資料不一致 - 修改固定年利率後，頁籤徽章與比較表必須與計算一致為 5%', () => {
    // 方案 1 預設 2.2%
    const s1 = (mortgageTool.example().scenarios as Values[])[0];
    expect((s1.segments as Values[])[0].annualRate).toBe('2.2');

    // 當使用者在固定利率輸入 5
    // 若只改 fixedRate 或若未以 segments 為唯一來源：
    // 目前現況：若 fixedRate 改為 5，但 segments[0].annualRate 未同步，徽章與比較表依然是 2.2%
    s1.fixedRate = '5';
    // 若未同步 s1.segments[0].annualRate，檢查現況下的徽章與比較表
    const badge = mortgageTool.scenarioBadge!(s1);
    const ev = mortgageTool.evaluate(s1, { scenarios: [] });
    const compInputs = mortgageTool.compareInputs!(s1, ev);
    const rateItem = compInputs.find((i) => i.label === '利率設定');

    // 依據修復要求：segments 作為唯一來源，固定利率直接對應第一段
    // 頁籤徽章必須顯示「年利率 5%」
    expect(badge).toBe('年利率 5%');
    // 比較表必須顯示「固定年利率 5%」
    expect(rateItem?.value).toBe('固定年利率 5%');
  });

  it('Defect 2: 比較表混用首期、月付範圍與寬限後月付 - 預設方案2首期應為 16,000，不可取到範圍 16,000 ~ 39,203', () => {
    const s2 = (mortgageTool.example().scenarios as Values[])[1];
    const ev2 = mortgageTool.evaluate(s2, { scenarios: [] });

    // 模擬 engine.ts 的比較邏輯：尋找 compareKey 為 'firstPayment' 的卡片
    const firstPaymentCard = ev2.cards.find((c) => (c.compareKey || c.label) === 'firstPayment');

    // 現況：取到第一張 core card「月付金範圍（寬限後遞減）」，值為 16,000 ~ 39,203
    // 要求：每個 compareKey 只代表一種明確指標，首期列必須是真正首期 NT$16,000
    expect(firstPaymentCard).toBeDefined();
    expect(firstPaymentCard?.value).toBe('NT$16,000');
    expect(firstPaymentCard?.value).not.toContain('~');
  });

  it('Defect 3: 舊版單段 JSON 無法正確還原 - 舊檔只有 segments 無 fixedRate，匯入後不得被判「請輸入固定年利率」', () => {
    const legacySingleSegmentJson = JSON.stringify({
      schemaVersion: 1,
      toolId: 'mortgage',
      inputs: {
        scenarios: [
          {
            name: '舊版方案 1',
            inputMode: 'price-down',
            price: '12,000,000',
            downPayment: '2,400,000',
            termMonths: '360',
            method: 'annuity',
            graceMonths: '0',
            fee: '15,000',
            monthlyIncome: '120,000',
            otherMonthlyDebt: '0',
            segments: [
              { startMonth: '1', annualRate: '2.2' },
            ],
          },
        ],
      },
    });

    const schema = schemaOf(mortgageTool);
    const result = parseImport(legacySingleSegmentJson, 'mortgage', schema);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const importedScenario = (result.value.scenarios as Values[])[0];
    const ev = mortgageTool.evaluate(importedScenario, result.value);

    // 現況：ev.errors.fixedRate === '請輸入固定年利率'，導致匯入後結果失效
    // 要求：相容舊單段，evaluate 成功且無 errors
    expect(ev.errors).toEqual({});
    expect(ev.cards.find((c) => c.label === '總利息支出')?.value).toBe('NT$3,522,461');
  });

  describe('Defect 4: 等值利率誤判衝突與嚴格數字解析邊界', () => {
    const schema = schemaOf(mortgageTool);

    it('重現：fixedRate="2.20"、segments[0].annualRate="2.2"，應視為等值而成功匯入，不可誤判衝突', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        toolId: 'mortgage',
        inputs: {
          scenarios: [
            {
              name: '等值利率方案',
              inputMode: 'price-down',
              price: '12,000,000',
              downPayment: '2,400,000',
              termMonths: '360',
              fixedRate: '2.20',
              segments: [{ startMonth: '1', annualRate: '2.2' }],
            },
          ],
        },
      });

      const res = parseImport(json, 'mortgage', schema);
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const s0 = (res.value.scenarios as Values[])[0];
      const ev = mortgageTool.evaluate(s0, res.value);
      expect(ev.errors).toEqual({});
    });

    it('等值利率：fixedRate="0" 與 segments[0].annualRate="0.0" 應視為相同', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        toolId: 'mortgage',
        inputs: {
          scenarios: [
            {
              name: '零利率等值方案',
              inputMode: 'price-down',
              price: '12,000,000',
              downPayment: '2,400,000',
              termMonths: '360',
              fixedRate: '0',
              segments: [{ startMonth: '1', annualRate: '0.0' }],
            },
          ],
        },
      });

      const res = parseImport(json, 'mortgage', schema);
      expect(res.ok).toBe(true);
    });

    it('真正衝突：fixedRate="2.2" 與 segments[0].annualRate="5" 必須拒絕匯入', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        toolId: 'mortgage',
        inputs: {
          scenarios: [
            {
              name: '衝突利率方案',
              fixedRate: '2.2',
              segments: [{ startMonth: '1', annualRate: '5' }],
            },
          ],
        },
      });

      const res = parseImport(json, 'mortgage', schema);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain('衝突');
      }
    });

    it('嚴格解析：含有垃圾字元的輸入（如 2.2abc）必須拒絕，不以 parseFloat 寬鬆放行', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        toolId: 'mortgage',
        inputs: {
          scenarios: [
            {
              name: '垃圾字元方案',
              fixedRate: '2.2abc',
              segments: [{ startMonth: '1', annualRate: '2.2' }],
            },
          ],
        },
      });

      const res = parseImport(json, 'mortgage', schema);
      expect(res.ok).toBe(false);
    });

    it('非法字串與超出範圍（如 NaN, Infinity, -1, 101）不得因修正而放行', () => {
      const invalidValues = ['NaN', 'Infinity', '-1', '101', 'abc'];
      for (const inv of invalidValues) {
        const json = JSON.stringify({
          schemaVersion: 1,
          toolId: 'mortgage',
          inputs: {
            scenarios: [
              {
                name: '無效方案',
                fixedRate: inv,
                segments: [{ startMonth: '1', annualRate: inv }],
              },
            ],
          },
        });
        const res = parseImport(json, 'mortgage', schema);
        expect(res.ok).toBe(false);
      }
    });
  });
});

