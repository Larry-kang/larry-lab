import { describe, expect, it } from 'vitest';
import { mortgageTool } from '../../src/lib/tools/mortgage';

describe('P0 / M12-02: mortgageTool 首期月付金正確性檢驗', () => {
  it('本金 120,000、12 期、12% 年利率、本金平均攤還：核心不得把 10,600 稱首期，首期應為 11,200', () => {
    const ev = mortgageTool.evaluate(
      {
        name: 'M12-02 測試方案',
        inputMode: 'principal',
        principal: '120,000',
        termMonths: '12',
        method: 'equal-principal',
        graceMonths: '0',
        fee: '0',
        segments: [{ startMonth: '1', annualRate: '12' }],
      },
      { scenarios: [] },
    );

    expect(ev.errors).toEqual({});

    // 核心卡片檢核
    const corePaymentCard = ev.cards.find((c) => c.isCore);
    expect(corePaymentCard).toBeDefined();

    // 鐵律：核心絕對不得將 10,600 標為「首期月付金」
    if (corePaymentCard?.label.includes('首期')) {
      expect(corePaymentCard.value).not.toContain('10,600');
      expect(corePaymentCard.value).toContain('11,200');
    }

    // 變動月付的核心卡片應呈現月付範圍（minPayment 至 maxPayment）
    expect(corePaymentCard?.value).toContain('10,100');
    expect(corePaymentCard?.value).toContain('11,200');

    // 次要卡片中首期月付金必須為 11,200
    const firstPaymentCard = ev.cards.find((c) => c.label === '首期月付金');
    expect(firstPaymentCard).toBeDefined();
    expect(firstPaymentCard?.value).toContain('11,200');

    // 最高月付金為 11,200
    const maxPaymentCard = ev.cards.find((c) => c.label === '最高月付金');
    expect(maxPaymentCard).toBeDefined();
    expect(maxPaymentCard?.value).toContain('11,200');

    // 總利息為 7,800
    const interestCard = ev.cards.find((c) => c.label === '總利息支出');
    expect(interestCard?.value).toContain('7,800');
  });
});
