import { calculateRetirement, type RetirementInput } from '../calculators/retirement';
import { cents } from '../csv';
import { formatTwd } from '../format';
import { FieldReader, type Values } from '../parse';
import type { Card, Evaluation, ToolDef } from '../ui/types';
import { amountField, card, integerField, invalid, newEvaluation, percentField, versionNote } from './shared';

function scenario(name: string, ret: string, overrides: Values = {}): Values {
  return {
    name,
    currentAge: '35',
    retireAge: '60',
    endAge: '90',
    assets: '2,000,000',
    monthlyContribution: '25,000',
    monthlySpending: '45,000',
    monthlyIncome: '10,000',
    incomeStartAge: '65',
    inflation: '3',
    returnBefore: ret,
    returnAfter: ret,
    ...overrides,
  };
}

export const retirementTool: ToolDef = {
  id: 'retirement',
  scenarioNoun: '情境',
  maxScenarios: 3,
  topFields: [
    {
      key: 'unit',
      label: '結果與圖表單位',
      kind: 'select',
      options: [
        { value: 'real', label: '今天購買力（排除通膨）' },
        { value: 'nominal', label: '未來名目金額（含通膨）' },
      ],
      hint: '切換只改變金額的表示單位，不改變是否足夠的判斷。',
    },
  ],
  scenarioFields: [
    integerField('currentAge', '目前年齡', '歲', { hint: '18–120 的整數歲數。' }),
    integerField('retireAge', '目標退休年齡', '歲', { hint: '可以等於目前年齡（今天退休）。' }),
    integerField('endAge', '規劃終止年齡', '歲', { hint: '必須大於目標退休年齡，最高 120。' }),
    amountField('assets', '可投資淨資產', { hint: '不含自住房屋，除非你假設它可以變現。' }),
    amountField('monthlyContribution', '退休前每月投入', { hint: '以今天購買力計，模型會隨通膨調整名目投入。' }),
    amountField('monthlySpending', '退休後每月支出', { hint: '以今天購買力計；未來債務支出請一併算進來。' }),
    amountField('monthlyIncome', '退休月收入（選填）', { hint: '以今天購買力計；留空表示沒有。' }),
    integerField('incomeStartAge', '開始領取年齡（選填）', '歲', { hint: '有退休月收入時必填，以實際年齡計。' }),
    percentField('inflation', '通膨率', { unit: '%/年', hint: '0–20%。' }),
    percentField('returnBefore', '退休前名目年報酬', { unit: '%/年', hint: '-99% 至 100%；是假設，不是保證報酬。' }),
    percentField('returnAfter', '退休後名目年報酬', { unit: '%/年', hint: '-99% 至 100%。' }),
  ],
  blank: () => ({
    unit: 'real',
    scenarios: [
      scenario('情境 1', '', {
        currentAge: '', retireAge: '', endAge: '', assets: '', monthlyContribution: '', monthlySpending: '', monthlyIncome: '', incomeStartAge: '', inflation: '',
      }),
    ],
  }),
  example: () => ({
    unit: 'real',
    scenarios: [
      scenario('情境 A（範例 5%）', '5'),
      scenario('情境 B（範例 7%）', '7'),
      scenario('情境 C（範例 10%）', '10'),
    ],
  }),
  evaluate(values, root): Evaluation {
    const r = new FieldReader(values);
    const input: RetirementInput = {
      currentAge: r.number('currentAge'),
      retireAge: r.number('retireAge'),
      endAge: r.number('endAge'),
      assets: r.number('assets'),
      monthlyContribution: r.number('monthlyContribution'),
      monthlySpending: r.number('monthlySpending'),
      monthlyIncome: r.optional('monthlyIncome') ?? 0,
      incomeStartAge: r.optional('incomeStartAge'),
      inflation: r.percent('inflation'),
      returnBefore: r.percent('returnBefore'),
      returnAfter: r.percent('returnAfter'),
    };
    const result = calculateRetirement(input);
    const errors = { ...result.errors, ...r.errors };
    if (Object.keys(errors).length > 0) return invalid(errors);

    const nominal = root.unit === 'nominal';
    const unitLabel = nominal ? '未來名目金額' : '今天購買力';
    const p = input.inflation;
    const Mr = 12 * (input.retireAge - input.currentAge);
    // Stock values are converted at the month they occur; monthly flows are shown at their first month.
    const stock = (value: number, month: number) => (nominal ? value * Math.pow(1 + p, month / 12) : value);
    const fmt = (value: number, month: number) => formatTwd(stock(value, month));
    const ev = newEvaluation();

    if (result.feasible) {
      ev.notices.push({ tone: 'good', text: `在這些假設下，資產可支應到 ${input.endAge} 歲。這是固定報酬假設下的推估，不是退休安全的保證。` });
    } else {
      ev.notices.push({ tone: 'bad', text: `在這些假設下，約 ${result.firstShortfallAge} 歲（第 ${result.firstShortfallMonth} 個月）首次資金不足，之後的支出沒有資金支應。` });
    }
    if (result.earliestRetireAge === null) {
      ev.notices.push({ tone: 'warn', text: '規劃期間內，在這些假設下沒有任何整歲年齡可以退休而不發生資金不足（不顯示捏造的年齡）。' });
    }
    if (result.noAccumulation) {
      ev.notices.push({ tone: 'info', text: '目標退休年齡等於目前年齡，沒有累積期：每月應存金額不適用，請看資金缺口。' });
    }
    if (result.maxSpendingExceedsCap) {
      ev.notices.push({ tone: 'warn', text: '目標年齡可負擔的月支出超過畫面上限（10 億元），上限值不是精確答案。' });
    }
    const gap = result.gap!;
    const cards: Card[] = [
      card(`今天退休所需本金（${unitLabel}）`, fmt(result.requiredToday!, 0), { compare: true, note: '假設現在就退休、支應到終止年齡' }),
      card(`目標年齡退休所需本金（${unitLabel}）`, fmt(result.requiredAtRetire!, Mr), { compare: true, note: nominal ? '以退休時點的名目金額表示' : '仍以今天購買力表示，不是退休時的通膨後金額' }),
      card(`目標年齡預估資產（${unitLabel}）`, fmt(result.projectedAtRetire!, Mr), { compare: true }),
      card(
        gap > 0 ? `資金缺口（${unitLabel}）` : `資金差額（${unitLabel}）`,
        gap > 0 ? fmt(gap, Mr) : `盈餘 ${fmt(Math.max(0, result.projectedAtRetire! - result.requiredAtRetire!), Mr)}`,
        { tone: gap > 0 ? 'bad' : 'good' },
      ),
      card(
        `每月應存金額（${unitLabel}）`,
        result.neededSaving === null ? '不適用（沒有累積期）' : fmt(result.neededSaving, nominal ? 1 : 0),
        { compare: true, note: nominal ? '第 1 個月的名目金額，之後依通膨逐月調整' : '每月投入、以今天購買力計' },
      ),
      card(`目標年齡可負擔最高月支出（${unitLabel}）`, `${result.maxSpendingExceedsCap ? '超過 ' : ''}${fmt(result.maxMonthlySpending!, nominal ? Mr + 1 : 0)}`, {
        note: nominal ? '退休第 1 個月的名目金額，之後依通膨調整' : '以今天購買力計',
      }),
      card('最早可退休年齡', result.earliestRetireAge === null ? '無法達標' : `${result.earliestRetireAge} 歲`, { compare: true, tone: result.earliestRetireAge === null ? 'bad' : 'neutral' }),
      card('首次資金不足年齡', result.firstShortfallAge === null ? '無（可支應到終止年齡）' : `${result.firstShortfallAge} 歲`, { compare: true, tone: result.feasible ? 'good' : 'bad' }),
    ];
    ev.cards.push(...cards);

    const yearly = result.points.filter((pt) => pt.month % 12 === 0);
    const pointsY = yearly.map((pt) => [pt.age + (pt.month === 0 ? 0 : 0), nominal ? pt.nominalBalance : pt.realBalance] as [number, number]);
    // x = age at the end of each year; month 0 is the current age.
    const series = yearly.map((pt, i) => [input.currentAge + i, nominal ? pt.nominalBalance : pt.realBalance] as [number, number]);
    void pointsY;
    ev.charts.push({
      title: `資產走勢（${unitLabel}）`,
      description: `從 ${input.currentAge} 歲到 ${input.endAge} 歲每年年底的預估資產，單位為${unitLabel}；標示目標退休年齡${result.feasible ? '' : '與首次資金不足年齡'}。`,
      xLabel: '年齡（歲）',
      yLabel: `資產（${unitLabel}，新台幣元）`,
      yKind: 'twd',
      xKind: 'integer',
      series: [{ name: `預估資產（${unitLabel}）`, points: series }],
      vLines: [
        { x: input.retireAge, label: `預計退休 ${input.retireAge} 歲` },
        ...(result.firstShortfallAge !== null ? [{ x: result.firstShortfallAge, label: `資金不足 ${result.firstShortfallAge} 歲` }] : []),
      ],
    });
    ev.csv = {
      filename: 'retirement-projection.csv',
      rows: [
        ['月份', '年齡（歲）', '階段', '資產（今天購買力，TWD）', '資產（未來名目，TWD）'],
        ...result.points.map((pt) => [pt.month, pt.age, pt.phase === 'work' ? '累積期' : '退休期', cents(pt.realBalance), cents(pt.nominalBalance)]),
      ],
    };
    ev.assumptions = [
      versionNote,
      '年齡以整歲計；每月月底投入、支出與領取收入；退休前後各採一個固定的名目年報酬，折算為實質月報酬。',
      '投入、支出與收入皆以今天購買力輸入，模型會隨通膨調整，代表名目投入也須隨物價增加。',
      '「今天退休所需本金」與「目標年齡退休所需本金」分開計算，後者仍以今天購買力呈現（除非切換為名目金額）。',
      '退休月收入從輸入的實際年齡開始，不是退休後的相對年數；工作期間的收入已包含在每月投入（淨儲蓄）內。',
      '資金不足時停止足額支應，不把負餘額畫成可用資產；圖表後段會維持 0。',
      '未計入：稅負、投資費用、醫療與長照支出的不確定性、自住房屋（除非你假設可變現）及報酬的波動。不提供 Monte Carlo 成功機率。',
      '三個情境的報酬 5%／7%／10% 與通膨 3% 只是範例假設，不是保證報酬，也不是個人化建議。',
    ];
    return ev;
  },
};
