import { calculateAccumulation, calculateAllocation } from '../calculators/portfolio';
import { cents } from '../csv';
import { formatMultiple, formatPercent, formatTwd } from '../format';
import { FieldReader, type Values } from '../parse';
import type { Evaluation, ListSpec, ToolDef } from '../ui/types';
import { amountField, card, integerField, invalid, newEvaluation, percentField, versionNote } from './shared';

const isAllocation = (_s: Values, root: Values) => root.mode !== 'accumulation';
const isAccumulation = (_s: Values, root: Values) => root.mode === 'accumulation';

const assetsSpec: ListSpec = {
  key: 'assets',
  label: '資產明細（1–20 筆）',
  itemLabel: '資產',
  addLabel: '新增資產',
  min: 1,
  max: 20,
  fields: [
    { key: 'name', label: '名稱', kind: 'text', placeholder: '例如：範例股票基金' },
    { key: 'category', label: '分類', kind: 'text', placeholder: '例如：股票' },
    amountField('value', '目前金額'),
    percentField('shock', '漲跌幅', { unit: '%', hint: '-100% 至 100%，單次變動' }),
  ],
  defaultItem: () => ({ name: '', category: '', value: '', shock: '' }),
  visibleIf: isAllocation,
};

const loansSpec: ListSpec = {
  key: 'loans',
  label: '貸款明細（0–10 筆）',
  itemLabel: '貸款',
  addLabel: '新增貸款',
  min: 0,
  max: 10,
  hint: '沒有貸款可不填；利息只另行顯示，不假設期間後扣除成本。',
  fields: [
    { key: 'name', label: '名稱', kind: 'text', placeholder: '例如：範例貸款' },
    amountField('principal', '貸款本金'),
    percentField('annualRate', '名目年利率', { unit: '%/年' }),
  ],
  defaultItem: () => ({ name: '', principal: '', annualRate: '' }),
  visibleIf: isAllocation,
};

const accAssetsSpec: ListSpec = {
  key: 'accAssets',
  label: '目標配置（1–20 筆，權重總和須為 100%）',
  itemLabel: '資產',
  addLabel: '新增資產',
  min: 1,
  max: 20,
  hint: '年總報酬已含配息，不要重複加計股息。',
  fields: [
    { key: 'name', label: '名稱', kind: 'text', placeholder: '例如：範例股票基金' },
    percentField('weight', '目標權重', { unit: '%' }),
    percentField('annualReturn', '假設年總報酬', { unit: '%/年', hint: '-99% 至 100%' }),
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
      label: '試算模式',
      kind: 'select',
      options: [
        { value: 'allocation', label: '配置／壓力（含貸款）' },
        { value: 'accumulation', label: '累積（無槓桿，每年再平衡）' },
      ],
      hint: '兩個模式互相獨立；切換不會刪除另一個模式已輸入的資料。',
    },
  ],
  scenarioFields: [
    assetsSpec,
    loansSpec,
    { ...amountField('initial', '期初資產'), visibleIf: isAccumulation },
    { ...amountField('monthlyContribution', '每月投入', { hint: '月底依目標權重投入。' }), visibleIf: isAccumulation },
    { ...integerField('years', '累積年數', '年', { hint: '1–60 年。' }), visibleIf: isAccumulation },
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
  ev.cards.push(
    card('總資產', formatTwd(result.gross!), { compare: true }),
    card('負債', formatTwd(result.debt!), { compare: true }),
    card('淨值', formatTwd(result.equity!), { compare: true, tone: result.equity! <= 0 ? 'bad' : 'neutral' }),
    card('負債比', result.debtRatio === null ? '不適用（N/A）' : formatPercent(result.debtRatio, 2), { compare: true, note: '負債 ÷ 總資產' }),
    card('槓桿倍數', result.leverage === null ? '不適用（N/A）' : formatMultiple(result.leverage), { compare: true, note: '總資產 ÷ 淨值' }),
    card('年利息', formatTwd(result.annualInterest!)),
    card('月利息', formatTwd(result.monthlyInterest!)),
    card('漲跌後總資產', formatTwd(result.stressGross!)),
    card('漲跌後淨值', formatTwd(result.stressEquity!), { compare: true, tone: result.stressEquityNegative ? 'bad' : 'neutral' }),
    card('淨值變動金額', formatTwd(result.equityChange!), { compare: true }),
    card('淨值報酬率', result.equityReturn === null ? '不適用（N/A）' : formatPercent(result.equityReturn, 2), { compare: true, note: '淨值變動 ÷ 期初淨值，可低於 -100%' }),
  );
  ev.tables.push({
    caption: '資產配置與漲跌後金額',
    columns: ['資產', '分類', '目前金額', '權重', '漲跌幅', '漲跌後金額'],
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
      ['資產', '分類', '目前金額（TWD）', '權重（小數）', '漲跌幅（小數）', '漲跌後金額（TWD）'],
      ...result.rows.map((row, i) => [label(row.name, `資產 ${i + 1}`), row.category, cents(row.value), row.weight === null ? 'N/A' : row.weight, row.shock, cents(row.stressedValue)]),
    ],
  };
  ev.assumptions = [
    versionNote,
    '輸入的漲跌幅只模擬「一次」價格變動，期間未指定，因此不計某段期間的借款利息；利息另行顯示。',
    '每日槓桿 ETF 與路徑效應不在第一版範圍，也不推論其漲跌路徑。',
    '總資產為 0 時權重與負債比不適用；期初淨值非正時槓桿倍數與淨值報酬率不適用。',
    '此工具不使用歷史行情，不自動交易，也不提出配置建議。',
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
  const errors = { ...remapAccumulationErrors(result.errors), ...r.errors };
  if (Object.keys(errors).length > 0) return invalid(errors);

  const ev = newEvaluation();
  ev.cards.push(
    card('累計投入', formatTwd(result.totalContributed!), { compare: true, note: '期初資產 + 每月投入 × 12 × 年數' }),
    card('預估期末價值', formatTwd(result.finalValue!), { compare: true }),
    card('預估收益', formatTwd(result.gain!), { compare: true, tone: result.gain! < 0 ? 'bad' : 'good', note: '期末價值 − 累計投入；假設報酬推估，不是歷史績效' }),
  );
  result.finalByAsset.forEach((value, i) => {
    ev.cards.push(card(`期末：${label(assets[i].name, `資產 ${i + 1}`)}`, formatTwd(value)));
  });
  ev.charts.push({
    title: '累積價值與累計投入',
    description: `逐年年底的預估價值與累計投入，共 ${result.yearRows.length - 1} 年。`,
    xLabel: '年數',
    yLabel: '金額（新台幣元）',
    yKind: 'twd',
    series: [
      { name: '預估價值', points: result.yearRows.map((y) => [y.year, y.value] as [number, number]) },
      { name: '累計投入', points: result.yearRows.map((y) => [y.year, y.contributed] as [number, number]) },
    ],
  });
  ev.tables.push({
    caption: '逐年累積表',
    columns: ['年數', '累計投入', '預估價值', '收益'],
    rows: result.yearRows.map((y) => [String(y.year), formatTwd(y.contributed), formatTwd(y.value), formatTwd(y.gain)]),
  });
  ev.csv = {
    filename: 'portfolio-accumulation.csv',
    rows: [
      ['年數', '累計投入（TWD）', '預估價值（TWD）', '收益（TWD）'],
      ...result.yearRows.map((y) => [y.year, cents(y.contributed), cents(y.value), cents(y.gain)]),
    ],
  };
  ev.assumptions = [
    versionNote,
    '無槓桿：每項資產各自以 (1 + 年總報酬)^(1/12) 逐月成長，月底依目標權重投入，並在每年第 12 個月底再平衡至目標權重（不計交易稅費）。',
    '年總報酬已含配息，不重複加計股息；此為假設報酬推估，不是歷史績效，也不是保證。',
    '不採用歷史行情、不提供借款投入模式、不計稅費。',
    '範例數字均為虛構，僅供示範。',
  ];
  return ev;
}
