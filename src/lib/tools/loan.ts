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
    // --- 基本輸入 ---
    amountField('principal', '貸款本金'),
    percentField('annualRate', '名目年利率', { unit: '%/年' }),
    integerField('termMonths', '貸款期數', '個月', { hint: '1–120 個月，本息平均攤還。', monthPresets: [12, 36, 60, 84, 120] }),
    amountField('fee', '開辦費用（選填）', { hint: '一次性手續費；必須小於本金，留空表示 0。' }),
    // --- 進階設定 ---
    {
      key: 'feeMode',
      label: '費用約定方式',
      kind: 'select',
      isAdvanced: true,
      options: [
        { value: 'deducted', label: '撥款時直接自本金扣除（實拿較少）' },
        { value: 'separate', label: '撥款當下另外支付（全額撥款）' },
      ],
      hint: '兩種方式的期初淨現金流成本相同，有效年化成本不會因此改變；此選項標示你的資金調度情境。',
    },
  ],
  blank: () => ({
    scenarios: [scenario('方案 1', { principal: '', annualRate: '', termMonths: '', fee: '' })],
  }),
  example: () => ({
    scenarios: [
      scenario('方案 1（範例）'),
      scenario('方案 2（範例：較高費用、較低利率）', { annualRate: '3.8', fee: '15,000' }),
    ],
  }),
  scenarioBadge(s: Values): string {
    const rate = s.annualRate ? `${s.annualRate}%` : '未設利率';
    return `年利率 ${rate}`;
  },
  advancedSummary(s: Values): string {
    return s.feeMode === 'separate' ? '費用另外支付' : '費用自撥款扣除';
  },
  syncFromA: {
    buttonLabel: '以第一個方案的基本條件套用至其他方案',
    description: '此操作將以第一個方案的貸款本金覆寫其他方案；各方案之年利率、期數、費用金額與約定方式將保留不變。',
    apply(target: Values, sourceA: Values) {
      target.principal = sourceA.principal;
    },
  },
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

    // 前三項核心結果 (Core Cards)
    ev.cards.push(
      card('每月還款金額', formatTwd(result.monthlyPayment!), {
        isCore: true,
        compare: true,
        note: '本息平均攤還，各期固定',
      }),
      card('估算有效年化成本', formatPercent(result.effectiveAnnualCost!, 2), {
        isCore: true,
        compare: true,
        tone: 'neutral',
        note: '依現金流複利估算；非貸款機構法規 APR',
      }),
      card('期初可用金額', formatTwd(result.netProceeds!), {
        isCore: true,
        compare: true,
        note: feeMode === 'deducted' ? '已扣除期初費用' : '費用另付，可用金額等於本金',
      }),
    );

    // 次要結果卡片
    ev.cards.push(
      card('貸款本金', formatTwd(r.number('principal')), { compare: true }),
      card('總利息支出', formatTwd(result.totalInterest!), { compare: true }),
      card('一次性費用', formatTwd(s.fee)),
      card('總支出（本息 + 費用）', formatTwd(result.totalCost!), { compare: true }),
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
