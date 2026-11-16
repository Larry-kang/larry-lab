import { calculateAccumulation, calculateAllocation } from '../calculators/portfolio';
import { cents } from '../csv';
import { formatMultiple, formatPercent, formatTwd } from '../format';
import { FieldReader, parseNumberText, type Values } from '../parse';
import type { Evaluation, ListSpec, ToolDef } from '../ui/types';
import { amountField, card, integerField, invalid, newEvaluation, percentField, versionNote } from './shared';

const isAllocation = (_s: Values, root: Values) => root.mode !== 'accumulation';
const isAccumulation = (_s: Values, root: Values) => root.mode === 'accumulation';

const assetsSpec: ListSpec = {
  key: 'assets',
  label: '現有資產配置明細（1–20 筆）',
  itemLabel: '資產',
  addLabel: '新增資產',
  min: 1,
  max: 20,
  fields: [
    { key: 'name', label: '資產名稱', kind: 'text', placeholder: '例如：台股 ETF / 美股基金' },
    { key: 'category', label: '資產分類', kind: 'text', placeholder: '例如：股票 / 債券 / 現金' },
    amountField('value', '目前市值金額'),
    percentField('shock', '自訂漲跌幅假設', { unit: '%', hint: '-100% 至 100%，模擬單次市場衝擊' }),
  ],
  defaultItem: () => ({ name: '', category: '', value: '', shock: '' }),
  visibleIf: isAllocation,
};

const loansSpec: ListSpec = {
  key: 'loans',
  label: '借款與負債明細（0–10 筆）',
  itemLabel: '負債',
  addLabel: '新增負債',
  min: 0,
  max: 10,
  isAdvanced: true,
  hint: '若無借款負債可留空；利息僅單獨列示，不預設期間扣除。',
  fields: [
    { key: 'name', label: '負債名稱', kind: 'text', placeholder: '例如：信貸 / 質押借款' },
    amountField('principal', '借款本金'),
    percentField('annualRate', '名目年利率', { unit: '%/年' }),
  ],
  defaultItem: () => ({ name: '', principal: '', annualRate: '' }),
  visibleIf: isAllocation,
};

const accAssetsSpec: ListSpec = {
  key: 'accAssets',
  label: '長期目標資產配置（1–20 筆，權重總和須恰為 100%）',
  itemLabel: '配置項目',
  addLabel: '新增配置項目',
  min: 1,
  max: 20,
  summary: (s) => {
    const items = Array.isArray(s.accAssets) ? s.accAssets : [];
    const weights = items.map(a => parseNumberText(String(a.weight ?? '')));
    if (weights.some(w => w.kind !== 'ok')) return '配置權重：請填寫每一項有效百分比，合計須為 100%。';
    const total = weights.reduce((sum,w) => sum + (w.kind === 'ok' ? w.value : 0), 0);
    const difference = Number((100 - total).toFixed(6));
    return `配置權重合計 ${Number(total.toFixed(6))}%（${Math.abs(difference) <= 0.0001 ? '已達 100%' : difference > 0 ? `還差 ${difference}%` : `超出 ${-difference}%`}）`;
  },
  hint: '年總報酬已包含息收再投資，請勿重複加計股息。權重總和必須等於 100%，系統不會自動等比例調整權重。',
  fields: [
    { key: 'name', label: '資產標的名稱', kind: 'text', placeholder: '例如：全球股票指數 / 綜合債券' },
    percentField('weight', '目標配置權重', { unit: '%', hint: '所有資產之權重相加須剛好等於 100%' }),
    percentField('annualReturn', '長期假設年化總報酬', { unit: '%/年', hint: '-99% 至 100% 複利預估' }),
  ],
  defaultItem: () => ({ name: '', weight: '', annualReturn: '' }),
  visibleIf: isAccumulation,
};

function scenario(name: string, overrides: Values = {}): Values {
  return {
    name,
    assets: [
      { name: '範例股票基金', category: '股票', value: '600,000', shock: '-20' },
      { name: '範例債券基金', category: '債券', value: '300,000', shock: '-5' },
      { name: '範例現金', category: '現金', value: '100,000', shock: '0' },
    ],
    loans: [{ name: '範例貸款', principal: '200,000', annualRate: '3' }],
    initial: '500,000',
    monthlyContribution: '20,000',
    years: '20',
    accAssets: [
      { name: '範例股票基金', weight: '70', annualReturn: '7' },
      { name: '範例債券基金', weight: '30', annualReturn: '3' },
    ],
    ...overrides,
  };
}

function blank(): Values {
  return {
    name: '方案 1',
    assets: [{ name: '', category: '', value: '', shock: '' }],
    loans: [],
    initial: '',
    monthlyContribution: '',
    years: '',
    accAssets: [{ name: '', weight: '', annualReturn: '' }],
  };
}

const label = (value: unknown, fallback: string) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback);

function remapAccumulationErrors(errors: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(errors)) {
    if (key === 'weightSum') out.accAssets = message;
    else if (key === 'assets') out.accAssets = message;
    else out[key.replace(/^assets\./, 'accAssets.')] = message;
  }
  return out;
}

export const portfolioTool: ToolDef = {
  id: 'portfolio',
  scenarioNoun: '方案',
  maxScenarios: 2,
  topFields: [
    {
      key: 'mode',
      label: '試算模式選擇',
      kind: 'select',
      options: [
        { value: 'allocation', label: '配置與壓力測試（含負債槓桿）' },
        { value: 'accumulation', label: '長期資產累積（定期定額與年度再平衡）' },
      ],
      hint: '兩模式各自獨立；切換不會清空另一模式已輸入之數值。',
    },
  ],
  scenarioFields: [
    // --- 配置模式欄位 ---
    assetsSpec,
    loansSpec,
    // --- 累積模式欄位 ---
    { ...amountField('initial', '期初投入資產'), visibleIf: isAccumulation },
    { ...amountField('monthlyContribution', '每月儲蓄投入金額', { hint: '每月月底依目標權重比例投入。' }), visibleIf: isAccumulation },
    { ...integerField('years', '長期累積年數', '年', { hint: '1–60 年整數。' }), visibleIf: isAccumulation },
    accAssetsSpec,
  ],
  blank: () => ({ mode: 'allocation', scenarios: [blank()] }),
  example: () => ({
    mode: 'allocation',
    scenarios: [
      scenario('目前配置（範例）'),
      scenario('調整後配置（範例）', {
        assets: [
          { name: '範例股票基金', category: '股票', value: '450,000', shock: '-20' },
          { name: '範例債券基金', category: '債券', value: '400,000', shock: '-5' },
          { name: '範例現金', category: '現金', value: '150,000', shock: '0' },
        ],
        accAssets: [
          { name: '範例股票基金', weight: '50', annualReturn: '7' },
          { name: '範例債券基金', weight: '50', annualReturn: '3' },
        ],
      }),
    ],
  }),
  comparisonBasis(s, root) {
    const number = (value: unknown) => { const parsed = parseNumberText(String(value ?? '')); return parsed.kind === 'ok' ? parsed.value : String(value ?? ''); };
    return root.mode === 'accumulation'
      ? { '期初投入': number(s.initial), '每月投入': number(s.monthlyContribution), '累積年數': number(s.years) }
      : { '資產配置': s.assets, '負債設定': s.loans };
  },
  compareInputs(s, _ev, root = {}) {
    if (root.mode === 'accumulation') return [
      { label: '期初投入', value: `${s.initial || '未填'} 元` },
      { label: '每月投入', value: `${s.monthlyContribution || '未填'} 元/月` },
      { label: '累積年數', value: `${s.years || '未填'} 年` },
      { label: '目標權重與年總報酬', value: (s.accAssets as Values[]).map(a=>`${a.name || '未命名'}：${a.weight || '未填'}%／年報酬 ${a.annualReturn || '未填'}%`).join('；') },
    ];
    return [
      { label: '資產與衝擊假設', value: (s.assets as Values[]).map(a=>`${a.name || '未命名'}：${a.value || '未填'} 元，漲跌 ${a.shock || '未填'}%`).join('；') },
      { label: '借款與年利率', value: (s.loans as Values[]).map(a=>`${a.name || '未命名'}：${a.principal || '未填'} 元，年利率 ${a.annualRate || '未填'}%`).join('；') || '無負債' },
    ];
  },
  scenarioBadge(s: Values, root: Values = {}): string {
    if (root.mode === 'accumulation') return `期初 ${s.initial || '未填'} 元 ｜ 每月 ${s.monthlyContribution || '未填'} 元 ｜ ${s.years || '未填'} 年`;
    const assets = Array.isArray(s.assets) ? (s.assets as Values[]) : [];
    const total = assets.reduce((sum, a) => sum + Number(String(a.value || '0').replace(/,/g, '')), 0);
    if (total > 0) return `總資產 ${formatTwd(total)}`;
    return '未設資產';
  },
  advancedSummary(s: Values, root: Values): string {
    if (root.mode === 'accumulation') return '長期累積不計入配置模式負債';
    const loans = Array.isArray(s.loans) ? (s.loans as Values[]) : [];
    const totalLoan = loans.reduce((sum, l) => sum + Number(String(l.principal || '0').replace(/,/g, '')), 0);
    return totalLoan > 0 ? `負債共 ${loans.length} 筆（${formatTwd(totalLoan)}）` : '無負債貸款';
  },
  evaluate(values, root): Evaluation {
    return root.mode === 'accumulation' ? evaluateAccumulation(values) : evaluateAllocation(values);
  },
};

function evaluateAllocation(values: Values): Evaluation {
  const r = new FieldReader(values);
  const assets = r.list('assets').map((_, i) => {
    const item = r.item('assets', i);
    return { name: item.text('name'), category: item.text('category'), value: item.number('value'), shock: item.percent('shock') };
  });
  const loans = r.list('loans').map((_, i) => {
    const item = r.item('loans', i);
    return { name: item.text('name'), principal: item.number('principal'), annualRate: item.percent('annualRate') };
  });
  const result = calculateAllocation({ assets, loans });
  const errors = { ...result.errors, ...r.errors };
  if (Object.keys(errors).length > 0) return invalid(errors);

  const ev = newEvaluation();
  if (result.status === 'no-equity') {
    ev.notices.push({ tone: 'bad', text: '淨值為零或負數（資產不足以償還負債）：槓桿倍數與淨值報酬率不適用（N/A）。' });
  }
  if (result.stressEquityNegative) {
    ev.notices.push({ tone: 'bad', text: '漲跌後淨值為負數，代表資產不足以償還負債，仍有負債尚未清償。' });
  }

  // --- 前三項核心重點結果卡片 ---
  const debt = result.debt!;
  const equityNote =
    debt > 0 ? `總資產 − 負債 ${formatTwd(debt)}` : '無負債，淨值等於總資產';
  const stressNoteParts = [`衝擊後總資產 ${formatTwd(result.stressGross!)}`];
  if (result.equityReturn !== null) {
    stressNoteParts.push(`淨值報酬率 ${formatPercent(result.equityReturn, 2)}（變動 ${formatTwd(result.equityChange!)}）`);
  } else {
    stressNoteParts.push(`淨值變動 ${formatTwd(result.equityChange!)}`);
  }
  ev.cards.push(
    card('總資產', formatTwd(result.gross!), {
      isCore: true,
      compare: true,
      compareKey: 'gross',
      compareLabel: '總資產',
      note: '全部持有資產市值總和',
    }),
    card('淨值（實質資產）', formatTwd(result.equity!), {
      isCore: true,
      compare: true,
      compareKey: 'equity',
      compareLabel: '淨值（實質資產）',
      tone: result.equity! <= 0 ? 'bad' : 'neutral',
      note: equityNote,
    }),
    card('漲跌後淨值', formatTwd(result.stressEquity!), {
      isCore: true,
      compare: true,
      compareKey: 'stressEquity',
      compareLabel: '漲跌後淨值',
      tone: result.stressEquityNegative ? 'bad' : 'neutral',
      note: stressNoteParts.join('；'),
    }),
  );

  // --- 次要與比較表結果卡片 ---
  // 總負債／漲跌後總資產／淨值變動／月利息併入核心註記；比較表仍保留關鍵槓桿指標
  // 無負債時總負債與負債比／槓桿重述淨值關係，結果格隱藏
  const hideDebtRestatement = debt === 0;
  ev.cards.push(
    card('總負債', formatTwd(debt), {
      compare: true,
      compareKey: 'debt',
      compareLabel: '總負債',
      resultsHide: hideDebtRestatement,
    }),
    card('負債比', result.debtRatio === null ? '不適用（N/A）' : formatPercent(result.debtRatio, 2), {
      compare: true,
      compareKey: 'debtRatio',
      compareLabel: '負債比',
      note: '負債 ÷ 總資產',
      resultsHide: hideDebtRestatement,
    }),
    card('槓桿倍數', result.leverage === null ? '不適用（N/A）' : formatMultiple(result.leverage), {
      compare: true,
      compareKey: 'leverage',
      compareLabel: '槓桿倍數',
      note: '總資產 ÷ 淨值',
      resultsHide: hideDebtRestatement,
    }),
    card('淨值報酬率', result.equityReturn === null ? '不適用（N/A）' : formatPercent(result.equityReturn, 2), {
      compare: true,
      compareKey: 'equityReturn',
      compareLabel: '淨值報酬率',
      note: '淨值變動 ÷ 期初淨值，可低於 -100%',
      // 核心「漲跌後淨值」註記已含報酬率／變動；結果格隱藏避免重述
      resultsHide: true,
    }),
    card('淨值變動金額', formatTwd(result.equityChange!), {
      compare: true,
      compareKey: 'equityChange',
      compareLabel: '淨值變動金額',
      resultsHide: true,
    }),
    card('漲跌後總資產', formatTwd(result.stressGross!), {
      compare: true,
      compareKey: 'stressGross',
      compareLabel: '漲跌後總資產',
      resultsHide: true,
    }),
  );
  if (result.annualInterest! > 0) {
    ev.cards.push(
      card('預估年利息', formatTwd(result.annualInterest!), {
        note: `約月息 ${formatTwd(result.monthlyInterest!)}（僅列示，不預設期間扣除）`,
      }),
    );
  }

  ev.tables.push({
    caption: '資產配置與漲跌衝擊明細',
    columns: ['資產名稱', '資產分類', '目前市值金額', '配置權重', '假設漲跌幅', '漲跌後市值金額'],
    rows: result.rows.map((row, i) => [
      label(row.name, `資產 ${i + 1}`),
      label(row.category, '—'),
      formatTwd(row.value),
      row.weight === null ? 'N/A' : formatPercent(row.weight, 2),
      formatPercent(row.shock, 2),
      formatTwd(row.stressedValue),
    ]),
  });
  ev.csv = {
    filename: 'portfolio-allocation.csv',
    rows: [
      ['資產名稱', '資產分類', '目前金額（TWD）', '權重（小數）', '漲跌幅（小數）', '漲跌後金額（TWD）'],
      ...result.rows.map((row, i) => [
        label(row.name, `資產 ${i + 1}`),
        label(row.category, ''),
        cents(row.value),
        row.weight === null ? 'N/A' : row.weight,
        row.shock,
        cents(row.stressedValue),
      ]),
    ],
  };
  ev.assumptions = [
    versionNote,
    '權重以總資產為基準；總資產為 0 時，權重與負債比不適用（N/A）。',
    '期初淨值小於或等於 0 時，槓桿倍數與淨值報酬率不適用（N/A）。',
    '漲跌幅為單次價格變動假設；此模式不計特定期間的借款利息，利息僅獨立顯示供參考。',
    '期初淨值為正但漲跌後為負時，淨值報酬率可低於 -100%，代表資產已不足以償還負債。',
    '未計入：交易手續費、稅負、各資產流動性差異、逐日波動與追繳條款。',
    '範例數字均為虛構，僅供示範。',
  ];
  return ev;
}

function evaluateAccumulation(values: Values): Evaluation {
  const r = new FieldReader(values);
  const assets = r.list('accAssets').map((_, i) => {
    const item = r.item('accAssets', i);
    return { name: item.text('name'), weight: item.percent('weight'), annualReturn: item.percent('annualReturn') };
  });
  const result = calculateAccumulation({
    initial: r.number('initial'),
    monthlyContribution: r.number('monthlyContribution'),
    years: r.number('years'),
    assets,
  });
  const errors = remapAccumulationErrors({ ...result.errors, ...r.errors });
  if (Object.keys(errors).length > 0) return invalid(errors);

  const ev = newEvaluation();

  // --- 前三項核心重點結果卡片（累積模式已精簡，對齊 compareKey） ---
  ev.cards.push(
    card('預估期末資產總值', formatTwd(result.finalValue!), {
      isCore: true,
      compare: true,
      compareKey: 'finalValue',
      compareLabel: '預估期末資產總值',
      note: `經 ${r.number('years')} 年複利成長與年度再平衡`,
    }),
    card('累計總投入本金', formatTwd(result.totalContributed!), {
      isCore: true,
      compare: true,
      compareKey: 'totalContributed',
      compareLabel: '累計總投入本金',
      note: '期初投入 + 全期每月儲蓄投入加總',
    }),
    card('累積預估投資收益', formatTwd(result.gain!), {
      isCore: true,
      compare: true,
      compareKey: 'gain',
      compareLabel: '累積預估投資收益',
      tone: result.gain! >= 0 ? 'good' : 'bad',
      note: '期末總資產 − 累計總投入本金',
    }),
  );

  ev.tables.push({
    caption: '逐年資產累積歷程',
    columns: ['年份', '累計投入（TWD）', '期末預估總值（TWD）', '累計收益（TWD）'],
    rows: result.yearRows.map((yr) => [
      yr.year === 0 ? '期初' : `第 ${yr.year} 年`,
      formatTwd(yr.contributed),
      formatTwd(yr.value),
      formatTwd(yr.gain),
    ]),
  });
  ev.charts.push({
    title: '長期資產累積與投入軌跡',
    description: `從第 0 年到第 ${r.number('years')} 年的累計投入與預估資產總值（每年底進行年度再平衡）。`,
    xLabel: '年數',
    yLabel: '金額（新台幣元）',
    yKind: 'twd',
    xKind: 'integer',
    series: [
      { name: '預估資產總值', points: result.yearRows.map((yr) => [yr.year, yr.value]) },
      { name: '累計投入本金', points: result.yearRows.map((yr) => [yr.year, yr.contributed]) },
    ],
  });
  ev.csv = {
    filename: 'portfolio-accumulation.csv',
    rows: [
      ['年份', '累計投入（TWD）', '期末價值（TWD）', '累計收益（TWD）'],
      ...result.yearRows.map((yr) => [yr.year, cents(yr.contributed), cents(yr.value), cents(yr.gain)]),
    ],
  };
  ev.assumptions = [
    versionNote,
    '無借款槓桿；每月月底依目標權重投入，每年年底重新調整至目標權重（年度再平衡）。',
    '權重總和必須在容許誤差內等於 100%，系統不會自動等比例正規化。',
    '年總報酬已包含息收再投資；每月以 (1 + r)^(1/12) 複利成長。',
    '再平衡只改變資產間的比例分配，不計交易稅費與滑價。',
    '未計入：手續費、交易稅、股息所得稅、匯率風險及歷史實際走勢的路徑差異。',
    '這是固定年報酬假設下的推估模型，不是歷史回測，也不代表未來投資績效保證。',
    '範例數字均為虛構，僅供示範。',
  ];
  return ev;
}
