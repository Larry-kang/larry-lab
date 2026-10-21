import { describe, it, expect } from 'vitest';
import { formatAmountEdit, monthsFromParts } from '../../src/lib/ui/input-edit';
import { mortgageTool } from '../../src/lib/tools/mortgage';
import { retirementTool } from '../../src/lib/tools/retirement';
import { portfolioTool } from '../../src/lib/tools/portfolio';
import type { Values } from '../../src/lib/parse';

describe('U01 金額字串編輯', () => {
  it('不以浮點數回寫，小數暫態與空白保持', () => {
    expect(formatAmountEdit('1234567.0200', 12, 12).text).toBe('1,234,567.0200');
    expect(formatAmountEdit('1234.', 5, 5).text).toBe('1,234.');
    expect(formatAmountEdit('', 0, 0).text).toBe('');
    expect(formatAmountEdit('0001234.50', 10, 10).text).toBe('0,001,234.50');
  });
  it('保留中段插入與選取位置、重新排列編輯後分隔符', () => {
    const inserted = formatAmountEdit('1,2934', 4, 4, true);
    expect(inserted.text).toBe('12,934');
    expect(inserted.start).toBe(4);
    const selected = formatAmountEdit('1234567', 2, 5);
    expect(selected).toEqual({ text: '1,234,567', start: 3, end: 7 });
  });
  it('非法文字及錯誤貼上不會被清洗成另一個有效金額', () => {
    for (const text of ['1e6', 'NT$1234', '1,2,3', '1.2.3', '12元', 'Infinity']) {
      expect(formatAmountEdit(text, text.length, text.length).text).toBe(text);
    }
  });
});

describe('U02–U05 預設與模式假設', () => {
  it('房貸範例及重設預設成數80%，不改舊設定評估', () => {
    for (const root of [mortgageTool.example(), mortgageTool.blank()]) {
      const s = (root.scenarios as Values[])[0];
      expect(s.inputMode).toBe('price-ltv'); expect(s.ltv).toBe('80');
    }
    const root = mortgageTool.example(); const s = (root.scenarios as Values[])[0];
    const old = { ...s, inputMode: 'price-down', ltv: '', downPayment: '2,400,000' };
    expect(mortgageTool.evaluate(old, root).cards.find(c=>c.compareKey==='principal')?.value).toBe('NT$9,600,000');
  });
  it('年月欄位以整數相加，拒絕無效月份而不捨入', () => {
    expect(monthsFromParts('30','5')).toBe('365');
    expect(monthsFromParts('0','1')).toBe('1');
    expect(monthsFromParts('50','0')).toBe('600');
    expect(monthsFromParts('','0')).toBe('');
    expect(monthsFromParts('30.5','0')).not.toMatch(/^\d+$/);
    expect(monthsFromParts('30','12')).not.toMatch(/^\d+$/);
  });
  it('退休預設無其他收入；既有非零收入仍可評估', () => {
    const root = retirementTool.example(); const s = (root.scenarios as Values[])[0];
    expect(s.monthlyIncome).toBe('0'); expect(s.incomeStartAge).toBe('');
    expect(retirementTool.evaluate(s, root).errors).toEqual({});
    expect(retirementTool.evaluate({...s,monthlyIncome:'10000',incomeStartAge:'65'},root).errors).toEqual({});
    expect(retirementTool.evaluate({...s,monthlyIncome:'10000',incomeStartAge:''},root).errors).toHaveProperty('incomeStartAge');
  });
  it('累積模式徽章及比較只使用累積資料', () => {
    const root = portfolioTool.example(); root.mode='accumulation'; const s=(root.scenarios as Values[])[0];
    expect(portfolioTool.scenarioBadge?.(s,root)).toContain('每月');
    expect(portfolioTool.scenarioBadge?.(s,root)).not.toContain('總資產');
    const inputs=portfolioTool.compareInputs?.(s,portfolioTool.evaluate(s,root),root);
    expect(inputs?.map(x=>x.label)).toContain('期初投入');
    expect(inputs?.map(x=>x.label)).toContain('累積年數');
  });
});
