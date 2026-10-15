import { calculateRetirement, type RetirementInput } from '../calculators/retirement';
import { cents } from '../csv';
import { formatTwd } from '../format';
import { FieldReader, type Values } from '../parse';
import type { Evaluation, ToolDef } from '../ui/types';
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
      label: '結果與圖表計價單位',
      kind: 'select',
      options: [
        { value: 'real', label: '今天購買力（排除物價上漲）' },
        { value: 'nominal', label: '未來名目金額（含通膨累積）' },
      ],
      hint: '切換只改變金額的幣值表示單位，不改變是否足額支應的數學判斷。',
    },
  ],
  scenarioFields: [
    // --- 基本輸入 ---
    integerField('currentAge', '目前年齡', '歲', { hint: '18–120 歲整數。' }),
    integerField('retireAge', '目標退休年齡', '歲', { hint: '可等於目前年齡（表示今天立即退休）。' }),
    integerField('endAge', '規劃終止年齡', '歲', { hint: '預期規劃壽命，必須大於退休年齡，最高 120 歲。' }),
    amountField('assets', '現有可投資淨資產', { hint: '以今天購買力計；不含自住房產（除非假設變現）。' }),
    amountField('monthlyContribution', '退休前每月儲蓄投入', { hint: '以今天購買力計；模型會隨通膨逐年調整名目投入。' }),
    amountField('monthlySpending', '退休後預估每月生活支出', { hint: '以今天購買力計；未來債務或醫療支出請一併計入。' }),
    // --- 進階設定 ---
    { ...percentField('inflation', '預估年通膨率', { unit: '%/年', hint: '0–20%，影響未來的名目物價水準。' }), isAdvanced: true },
    { ...percentField('returnBefore', '退休前名目年報酬率', { unit: '%/年', hint: '-99% 至 100%；是假設數值，非保證報酬。' }), isAdvanced: true },
    { ...percentField('returnAfter', '退休後名目年報酬率', { unit: '%/年', hint: '-99% 至 100%；退休期通常採較保守資產配置。' }), isAdvanced: true },
    { ...amountField('monthlyIncome', '其他退休月收入（選填）', { hint: '如勞保年金等，以今天購買力計；留空表示 0。' }), isAdvanced: true },
    { ...integerField('incomeStartAge', '月收入開始領取年齡（選填）', '歲', { hint: '有其他年金月收入時必填，以實際年齡計算。' }), isAdvanced: true },
  ],
  blank: () => ({
    unit: 'real',
    scenarios: [
      scenario('情境 1', '', {
        currentAge: '', retireAge: '', endAge: '', assets: '', monthlyContribution: '', monthlySpending: '', monthlyIncome: '', incomeStartAge: '', inflation: '',
      }),
    ],
  }),
  // NEXT_VERSION_SPEC 第 8 節：初次頁面預設只呈現一個清楚標示的範例 A
  example: () => ({
    unit: 'real',
    scenarios: [
      scenario('情境 A（範例 5%）', '5'),
    ],
  }),
  presetScenariosAction: {
    label: '載入三組報酬範例（5%、7%、10%）',
    description: '此操作將載入以保守 5%、穩健 7%、積極 10% 三種報酬率對比的情境範例。',
    load: () => [
      scenario('情境 A（5% 報酬）', '5'),
      scenario('情境 B（7% 報酬）', '7'),
      scenario('情境 C（10% 報酬）', '10'),
    ],
  },
  scenarioBadge(s: Values): string {
    const before = s.returnBefore;
    const after = s.returnAfter;
    if (before && after && before === after) {
      return `年報酬 ${before}%`;
    }
    if (before || after) {
      return `前 ${before || '0'}% ｜ 後 ${after || '0'}%`;
    }
    return '未設報酬率';
  },
  advancedSummary(s: Values): string {
    const inf = s.inflation || '3';
    const before = s.returnBefore || '5';
    const after = s.returnAfter || '5';
    return `通膨 ${inf}% ｜ 報酬前 ${before}% 後 ${after}%`;
  },
  syncFromA: {
    buttonLabel: '以情境 A 的基本條件套用至其他情境',
    description: '此操作將以情境 A 的目前年齡、退休/終止年齡、資產、月投入/月支出、通膨與年金收入覆寫其他情境；各情境自訂的投資報酬率與名稱將保留不變。',
    apply(target: Values, sourceA: Values) {
      target.currentAge = sourceA.currentAge;
      target.retireAge = sourceA.retireAge;
      target.endAge = sourceA.endAge;
      target.assets = sourceA.assets;
      target.monthlyContribution = sourceA.monthlyContribution;
      target.monthlySpending = sourceA.monthlySpending;
      target.monthlyIncome = sourceA.monthlyIncome;
      target.incomeStartAge = sourceA.incomeStartAge;
      target.inflation = sourceA.inflation;
    },
  },
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

    // 前三項核心結果 (Core Cards)
    ev.cards.push(
      card(`目標退休所需本金（${unitLabel}）`, fmt(result.requiredAtRetire!, Mr), {
        isCore: true,
        compare: true,
        note: nominal ? '以退休時點名目金額表示' : '以今天購買力表示',
      }),
      card(
        `每月應存金額（${unitLabel}）`,
        result.neededSaving === null ? '不適用（沒有累積期）' : fmt(result.neededSaving, nominal ? 1 : 0),
        {
          isCore: true,
          compare: true,
          note: result.neededSaving === null ? '已達退休年齡' : nominal ? '首月名目金額，隨通膨逐年調整' : '以今天購買力計',
        },
      ),
      card('最早可退休年齡', result.earliestRetireAge === null ? '無法達標' : `${result.earliestRetireAge} 歲`, {
        isCore: true,
        compare: true,
        tone: result.earliestRetireAge === null ? 'bad' : 'neutral',
        note: result.earliestRetireAge === null ? '規劃期間資產不足支應' : `以此假設最早可在 ${result.earliestRetireAge} 歲達標`,
      }),
    );

    // 次要結果卡片
    const gap = result.gap!;
    ev.cards.push(
      card(`今天退休所需本金（${unitLabel}）`, fmt(result.requiredToday!, 0), { compare: true, note: '假設現在立即退休、支應至終止年齡' }),
      card(`目標年齡預估資產（${unitLabel}）`, fmt(result.projectedAtRetire!, Mr), { compare: true }),
      card(
        gap > 0 ? `資金缺口（${unitLabel}）` : `資金差額（${unitLabel}）`,
        gap > 0 ? fmt(gap, Mr) : `盈餘 ${fmt(Math.max(0, result.projectedAtRetire! - result.requiredAtRetire!), Mr)}`,
        { tone: gap > 0 ? 'bad' : 'good' },
      ),
      card(`目標年齡可負擔最高月支出（${unitLabel}）`, `${result.maxSpendingExceedsCap ? '超過 ' : ''}${fmt(result.maxMonthlySpending!, nominal ? Mr + 1 : 0)}`, {
        note: nominal ? '退休首月名目金額，隨通膨調整' : '以今天購買力計',
      }),
      card('首次資金不足年齡', result.firstShortfallAge === null ? '無（可支應到終止年齡）' : `${result.firstShortfallAge} 歲`, { compare: true, tone: result.feasible ? 'good' : 'bad' }),
    );

    const yearly = result.points.filter((pt) => pt.month % 12 === 0);
    const series = yearly.map((pt, i) => [input.currentAge + i, nominal ? pt.nominalBalance : pt.realBalance] as [number, number]);
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
      '情境中的報酬與通膨皆為假設，不是保證報酬，也不是個人化建議。',
    ];
    return ev;
  },
};
