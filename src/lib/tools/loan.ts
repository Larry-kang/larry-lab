import { calculatePersonalLoan, type FeeMode } from '../calculators/loan';
import { formatPercent, formatTwd } from '../format';
import { FieldReader, type Values } from '../parse';
import type { Evaluation, ToolDef } from '../ui/types';
import { amountField, balanceChart, card, integerField, invalid, newEvaluation, percentField, scheduleCsv, scheduleTable, versionNote } from './shared';

function scenario(name: string, overrides: Values = {}): Values {
  return {
    name,
    principal: '500,000',
    annualRate: '4.5',
    termMonths: '60',
    fee: '5,000',
    feeMode: 'deducted',
    ...overrides,
  };
}

export const loanTool: ToolDef = {
  id: 'personal-loan',
  scenarioNoun: '方案',
  maxScenarios: 3,
  topFields: [],
  scenarioFields: [
    amountField('principal', '貸款本金'),
    percentField('annualRate', '名目年利率', { unit: '%/年' }),
    integerField('termMonths', '貸款期數', '個月', { hint: '1–120 個月，本息平均攤還。' }),
    amountField('fee', '費用（選填）', { hint: '開辦費等一次性費用；必須小於貸款本金，留空表示 0。' }),
    {
      key: 'feeMode',
      label: '費用處理方式',
      kind: 'select',
      options: [
        { value: 'deducted', label: '撥款時扣除' },
        { value: 'separate', label: '撥款當下另外支付' },
      ],
      hint: '兩種方式的期初淨現金流成本相同，數字不會因此改變；此選項只標示你的情境。',
    },
  ],
  blank: () => ({
    scenarios: [scenario('方案 1', { principal: '', annualRate: '', termMonths: '', fee: '' })],
  }),
  example: () => ({
    scenarios: [scenario('方案 1（範例）'), scenario('方案 2（範例：較高費用、較低利率）', { annualRate: '3.8', fee: '15,000' })],
  }),
  evaluate(values): Evaluation {
    const r = new FieldReader(values);
    const feeMode = r.choice<FeeMode>('feeMode');
    const result = calculatePersonalLoan({
      principal: r.number('principal'),
      annualRate: r.percent('annualRate'),
      termMonths: r.number('termMonths'),
      fee: r.optional('fee') ?? 0,
      feeMode,
    });
    const errors = { ...result.errors, ...r.errors };
    if (Object.keys(errors).length > 0) return invalid(errors);
    const ev = newEvaluation();
    if (result.status === 'infeasible' || !result.schedule?.summary) {
      return invalid({ principal: result.message ?? '無法計算，請調整輸入。' });
    }
    const s = result.schedule.summary;
    ev.cards.push(
      card('貸款本金', formatTwd(r.number('principal')), { compare: true }),
      card('扣除費用後可用金額', formatTwd(result.netProceeds!), {
        compare: true,
        note: feeMode === 'deducted' ? '費用於撥款時扣除' : '費用於撥款當下另外支付，實際可用金額仍為本金',
      }),
      card('月付金', formatTwd(result.monthlyPayment!), { compare: true }),
      card('利息總額', formatTwd(result.totalInterest!), { compare: true }),
      card('費用', formatTwd(s.fee)),
      card('總支出（本息 + 費用）', formatTwd(result.totalCost!), { compare: true }),
      card('估算有效年化成本', formatPercent(result.effectiveAnnualCost!, 2), {
        compare: true,
        tone: 'neutral',
        note: '依本工具現金流估算；不是貸款機構依法揭露的 APR／總費用年百分率',
      }),
    );
    ev.charts.push(balanceChart(result.schedule, r.number('principal')));
    ev.tables.push(scheduleTable(result.schedule, '逐月攤還表'));
    ev.csv = { filename: 'personal-loan-schedule.csv', rows: scheduleCsv(result.schedule) };
    ev.assumptions = [
      versionNote,
      '採固定名目年利率、本息平均攤還；月利率 = 年利率 ÷ 12，還款在每月月底發生。',
      '估算有效年化成本：以「貸款本金 − 費用」為期初淨流入、各期月付金為流出，求月內部報酬率 x，再以 (1 + x)^12 − 1 複利年化，不是 12 × x。',
      '費用從撥款扣除，或在撥款當下另外支付，兩者的期初淨現金流成本相同，不會重複計算。',
      '此數字稱為「估算有效年化成本（依本工具現金流）」，與貸款機構依法揭露的 APR 約定可能不同。',
      '未計入：保險、逾期違約金、提前清償成本及貸款機構個別條件。',
      '範例數字均為虛構，僅供示範。',
    ];
    return ev;
  },
};
