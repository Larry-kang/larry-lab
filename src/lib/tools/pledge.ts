import { calculatePledge, type PledgeInput } from '../calculators/pledge';
import { cents } from '../csv';
import { formatPercent, formatTwd } from '../format';
import { FieldReader, type Values } from '../parse';
import type { Evaluation, ToolDef } from '../ui/types';
import { amountField, card, integerField, invalid, newEvaluation, percentField, versionNote } from './shared';

function scenario(name: string, overrides: Values = {}): Values {
  return {
    name,
    collateralValue: '1,000,000',
    loanToValue: '60',
    loanAmount: '600,000',
    annualRate: '3',
    days: '365',
    warningRatio: '130',
    targetRatio: '166',
    customShock: '-40',
    ...overrides,
  };
}

export const pledgeTool: ToolDef = {
  id: 'stock-pledge',
  scenarioNoun: '方案',
  maxScenarios: 3,
  topFields: [],
  scenarioFields: [
    amountField('collateralValue', '合格擔保品彙總市值', { hint: '單一彙總金額；請只填貸款機構實際接受的合格擔保品。' }),
    percentField('loanToValue', '可貸成數（範例）', { unit: '%', hint: '預設 60% 是範例，不是通用券商規則。' }),
    amountField('loanAmount', '實際借款', { hint: '壓力試算時可高於範例可借上限，系統只提醒，不自動修改。' }),
    percentField('annualRate', '名目年利率', { unit: '%/年' }),
    integerField('days', '借款天數', '天', { hint: '1–3650 天；期間利息以範例 Actual/365 計算。' }),
    percentField('warningRatio', '警示維持率（範例）', { hint: '預設 130% 是範例，請依自己的契約調整。' }),
    percentField('targetRatio', '補足目標維持率（範例）', { hint: '預設 166% 是範例，須大於或等於警示維持率。' }),
    percentField('customShock', '自訂擔保品漲跌幅', { hint: '例如 -40 表示下跌 40%；範圍 -100% 至 100%。' }),
  ],
  blank: () => ({
    scenarios: [scenario('方案 1', { collateralValue: '', loanToValue: '', loanAmount: '', annualRate: '', days: '', warningRatio: '', targetRatio: '', customShock: '' })],
  }),
  example: () => ({
    scenarios: [scenario('方案 1（範例）'), scenario('方案 2（範例：借款較少）', { loanAmount: '400,000' })],
  }),
  evaluate(values): Evaluation {
    const r = new FieldReader(values);
    const input: PledgeInput = {
      collateralValue: r.number('collateralValue'),
      loanToValue: r.percent('loanToValue'),
      loanAmount: r.number('loanAmount'),
      annualRate: r.percent('annualRate'),
      days: r.number('days'),
      warningRatio: r.percent('warningRatio'),
      targetRatio: r.percent('targetRatio'),
      customShock: r.percent('customShock'),
    };
    const result = calculatePledge(input);
    const errors = { ...result.errors, ...r.errors };
    if (Object.keys(errors).length > 0) return invalid(errors);

    const ev = newEvaluation();
    const hasDebt = result.status !== 'no-debt';
    if (!hasDebt) {
      ev.notices.push({ tone: 'good', text: '借款為 0：目前無負債、無追繳狀態；維持率與跌幅門檻不適用（N/A），利息為 0。' });
    }
    if (result.atOrBelowThreshold) {
      ev.notices.push({ tone: 'bad', text: '擔保品市值已達或低於你設定的警示門檻。此處的維持率只是簡化模型，實際處理方式及時限以貸款契約為準。' });
    }
    if (result.overIllustratedLimit) {
      ev.notices.push({ tone: 'warn', text: `實際借款高於範例可借上限 ${formatTwd(result.illustratedLimit!)}；壓力試算仍照你輸入的借款計算。` });
    }
    ev.cards.push(
      card('範例可借上限', formatTwd(result.illustratedLimit!), { note: '擔保品市值 × 範例可貸成數' }),
      card('擔保品淨值', formatTwd(result.equity!), { note: '擔保品市值 − 借款', tone: result.equity! < 0 ? 'bad' : 'neutral' }),
      card('目前簡化維持率', hasDebt ? formatPercent(result.maintenance!, 2) : '不適用（N/A）', { compare: true, tone: result.atOrBelowThreshold ? 'bad' : 'neutral', note: '擔保品市值 ÷ 借款' }),
      card('年息', formatTwd(result.yearInterest!), { compare: true }),
      card('平均月息', formatTwd(result.averageMonthlyInterest!)),
      card(`期間利息（${input.days} 天）`, formatTwd(result.termInterest!), { compare: true, note: '範例 Actual/365 基準' }),
      card('警示門檻擔保品市值', hasDebt ? formatTwd(result.thresholdCollateral!) : '不適用（N/A）', { note: '借款 × 警示維持率；不是保證的處分價格' }),
      card(
        '相對目前市值可承受跌幅',
        !hasDebt ? '不適用（N/A）' : result.atOrBelowThreshold ? '已達／低於設定門檻' : formatPercent(result.dropToThreshold!, 2),
        { compare: true, tone: result.atOrBelowThreshold ? 'bad' : 'neutral' },
      ),
    );
    ev.tables.push({
      caption: '擔保品漲跌情境',
      columns: ['情境', '擔保品市值', '維持率', '淨值', '是否低於警示', '現金還款（回復至目標）', '追加合格證券（回復至目標）'],
      rows: result.scenarios.map((s) => [
        s.label,
        formatTwd(s.collateral),
        s.maintenance === null ? 'N/A' : formatPercent(s.maintenance, 2),
        formatTwd(s.equity),
        !hasDebt ? '無負債' : s.belowWarning ? '是（低於或達警示）' : '否',
        formatTwd(s.cashRepaymentToTarget),
        formatTwd(s.additionalCollateralToTarget),
      ]),
      note: '「現金還款」與「追加合格證券」是兩種各自獨立、可擇一的回復方式，不可相加。若貸款機構接受現金作擔保，該現金屬於追加擔保品，不是還款。',
    });
    if (hasDebt) {
      const points: Array<[number, number]> = [];
      for (let pct = -60; pct <= 20; pct += 5) points.push([pct, (input.collateralValue * (1 + pct / 100)) / input.loanAmount]);
      ev.charts.push({
        title: '擔保品漲跌與維持率',
        description: `橫軸是擔保品漲跌幅，縱軸是簡化維持率；警示維持率 ${formatPercent(input.warningRatio, 0)}、補足目標 ${formatPercent(input.targetRatio, 0)}。`,
        xLabel: '擔保品漲跌幅（%）',
        yLabel: '維持率',
        yKind: 'percent',
        series: [{ name: '簡化維持率', points }],
        hLines: [
          { y: input.warningRatio, label: `警示 ${formatPercent(input.warningRatio, 0)}` },
          { y: input.targetRatio, label: `目標 ${formatPercent(input.targetRatio, 0)}` },
        ],
      });
    }
    ev.csv = {
      filename: 'stock-pledge-scenarios.csv',
      rows: [
        ['情境', '漲跌幅（小數）', '擔保品市值（TWD）', '維持率（小數）', '淨值（TWD）', '現金還款至目標（TWD）', '追加合格證券至目標（TWD）'],
        ...result.scenarios.map((s) => [s.label, s.shock, cents(s.collateral), s.maintenance === null ? 'N/A' : s.maintenance, cents(s.equity), cents(s.cashRepaymentToTarget), cents(s.additionalCollateralToTarget)]),
      ],
    };
    ev.assumptions = [
      versionNote,
      '簡化維持率 = 擔保品市值 ÷ 借款；期間利息 = 借款 × 年利率 × 天數 ÷ 365（範例 Actual/365）。',
      '範例可貸成數 60%、警示 130%、補足目標 166% 皆為可調整的範例，不是通用券商規則；不同產品與契約可能完全不同。',
      '現金還款會降低負債；追加合格證券會增加擔保品；兩者擇一即可回復至目標，不可相加。',
      '警示門檻不是保證的斷頭價格，也不代表任何補繳期限或處分時點。',
      '未計入：貸款機構的擔保品折算率、利息併入負債、公司行動（配股配息、下市）及契約條款。',
      '範例數字均為虛構，僅供示範。',
    ];
    return ev;
  },
};
