import { calculateMortgage, type MortgageInput, type MortgageInputMode } from '../calculators/mortgage';
import type { RepaymentMethod } from '../calculators/amortization';
import { formatPercent, formatTwd } from '../format';
import { FieldReader, type Values } from '../parse';
import type { Evaluation, ListSpec, ToolDef } from '../ui/types';
import { amountField, balanceChart, card, integerField, invalid, newEvaluation, percentField, scheduleCsv, scheduleTable, versionNote } from './shared';

const modeIs = (mode: MortgageInputMode) => (s: Values) => (s.inputMode ?? 'principal') === mode;
const notMode = (mode: MortgageInputMode) => (s: Values) => (s.inputMode ?? 'principal') !== mode;

const segmentsSpec: ListSpec = {
  key: 'segments',
  label: '利率分段（名目年利率）',
  itemLabel: '利率段',
  addLabel: '新增利率段',
  min: 1,
  max: 10,
  hint: '第一段必須從第 1 個月開始；每段持續到下一段起始月份。單一固定利率只需一段。',
  fields: [
    integerField('startMonth', '起始月份', '第幾個月'),
    percentField('annualRate', '名目年利率', { unit: '%/年' }),
  ],
  defaultItem: () => ({ startMonth: '', annualRate: '' }),
};

function scenario(name: string, overrides: Values = {}): Values {
  return {
    name,
    inputMode: 'price-down',
    principal: '',
    price: '12,000,000',
    downPayment: '2,400,000',
    ltv: '',
    termMonths: '360',
    method: 'annuity',
    graceMonths: '0',
    fee: '15,000',
    monthlyIncome: '120,000',
    otherMonthlyDebt: '0',
    segments: [{ startMonth: '1', annualRate: '2.2' }],
    ...overrides,
  };
}

function blankScenario(): Values {
  return {
    name: '方案 1',
    inputMode: 'price-down',
    principal: '',
    price: '',
    downPayment: '',
    ltv: '',
    termMonths: '',
    method: 'annuity',
    graceMonths: '',
    fee: '',
    monthlyIncome: '',
    otherMonthlyDebt: '',
    segments: [{ startMonth: '1', annualRate: '' }],
  };
}

export const mortgageTool: ToolDef = {
  id: 'mortgage',
  scenarioNoun: '方案',
  maxScenarios: 3,
  topFields: [],
  scenarioFields: [
    {
      key: 'inputMode',
      label: '輸入模式',
      kind: 'select',
      clearsHidden: true,
      options: [
        { value: 'price-down', label: '房價 + 頭期款' },
        { value: 'price-ltv', label: '房價 + 貸款成數' },
        { value: 'principal', label: '直接輸入貸款本金' },
      ],
      hint: '切換模式會清除不再使用的欄位，避免房價、本金、頭期款互相矛盾。',
    },
    { ...amountField('principal', '貸款本金'), visibleIf: modeIs('principal') },
    { ...amountField('price', '房價'), visibleIf: notMode('principal') },
    { ...amountField('downPayment', '頭期款', { hint: '貸款本金 = 房價 − 頭期款' }), visibleIf: modeIs('price-down') },
    { ...percentField('ltv', '貸款成數', { hint: '貸款本金 = 房價 × 貸款成數，0–100%' }), visibleIf: modeIs('price-ltv') },
    integerField('termMonths', '貸款期數', '個月', { hint: '1–600 個月（例如 30 年 = 360）' }),
    {
      key: 'method',
      label: '攤還方式',
      kind: 'select',
      options: [
        { value: 'annuity', label: '本息平均攤還（月付金固定）' },
        { value: 'equal-principal', label: '本金平均攤還（月付金逐月遞減）' },
      ],
    },
    integerField('graceMonths', '寬限期（選填）', '個月', { hint: '只付利息的月數，包含在總期數內；留空表示 0（無寬限期）。' }),
    amountField('fee', '一次性費用（選填）', { hint: '期初支付，不併入貸款本金；留空表示 0。' }),
    amountField('monthlyIncome', '月收入（選填）', { hint: '填寫後才計算負擔比例；必須大於 0。' }),
    amountField('otherMonthlyDebt', '其他貸款月付金（選填）', { hint: '用於負擔比例；留空表示 0。' }),
    segmentsSpec,
  ],
  blank: () => ({ scenarios: [blankScenario()] }),
  example: () => ({
    scenarios: [
      scenario('方案 1（範例）'),
      scenario('方案 2（範例：寬限期）', { graceMonths: '24', segments: [{ startMonth: '1', annualRate: '2.0' }, { startMonth: '37', annualRate: '2.4' }] }),
    ],
  }),
  evaluate(values): Evaluation {
    const r = new FieldReader(values);
    const mode = r.choice<MortgageInputMode>('inputMode');
    const segments = r.list('segments').map((_, i) => {
      const item = r.item('segments', i);
      return { startMonth: item.number('startMonth'), annualRate: item.percent('annualRate') };
    });
    const input: MortgageInput = {
      mode,
      principal: mode === 'principal' ? r.number('principal') : undefined,
      price: mode !== 'principal' ? r.number('price') : undefined,
      downPayment: mode === 'price-down' ? r.number('downPayment') : undefined,
      ltv: mode === 'price-ltv' ? r.percent('ltv') : undefined,
      termMonths: r.number('termMonths'),
      segments,
      method: r.choice<RepaymentMethod>('method'),
      graceMonths: r.optional('graceMonths') ?? 0,
      fee: r.optional('fee') ?? 0,
      monthlyIncome: r.optional('monthlyIncome'),
      otherMonthlyDebt: r.optional('otherMonthlyDebt'),
    };
    const result = calculateMortgage(input);
    const errors = { ...result.errors, ...r.errors };
    if (Object.keys(errors).length > 0 || !result.schedule?.summary || !result.derived) return invalid(errors);

    const ev = newEvaluation();
    const s = result.schedule.summary;
    const d = result.derived;
    if (result.status === 'no-debt') {
      ev.notices.push({ tone: 'info', text: '貸款本金為 0：沒有分期付款與利息。若有輸入一次性費用，仍列於總支出。' });
    }
    if (d.price !== null && d.downPayment !== null) {
      ev.cards.push(card('房價', formatTwd(d.price)), card('頭期款', formatTwd(d.downPayment), { note: '頭期款不計入貸款利息' }));
    }
    ev.cards.push(card('貸款本金', formatTwd(d.principal), { compare: true }));
    if (result.status !== 'no-debt') {
      ev.cards.push(
        card('首期月付金', formatTwd(s.firstPayment), { compare: true, note: s.gracePayment !== null ? '寬限期內只付利息' : undefined }),
        card('一般月付金（中段）', formatTwd(s.regularPayment)),
        card('最高月付金', formatTwd(s.maxPayment), { compare: true }),
      );
      if (s.gracePayment !== null) {
        ev.cards.push(
          card('寬限期月付金', formatTwd(s.gracePayment)),
          card('寬限期結束後首期月付金', formatTwd(s.postGraceFirstPayment)),
        );
      }
      if (!s.paymentIsConstant) {
        ev.notices.push({
          tone: 'info',
          text: `月付金會變動，範圍約 ${formatTwd(s.minPayment)} 至 ${formatTwd(s.maxPayment)}；請以逐月攤還表為準，不要用單一金額代表全部期數。`,
        });
      }
    }
    ev.cards.push(
      card('利息總額', formatTwd(s.totalInterest), { compare: true }),
      card('一次性費用', formatTwd(s.fee)),
      card('總支出（本息 + 費用）', formatTwd(s.totalCost), { compare: true, note: `償還本金 ${formatTwd(s.totalPrincipal)}` }),
    );
    if (result.burdenRatio !== null) {
      ev.cards.push(
        card('負擔比例（預算參考）', formatPercent(result.burdenRatio, 1), {
          compare: true,
          note: '（最高月付金 + 其他貸款月付金）÷ 月收入',
        }),
      );
      ev.notices.push({ tone: 'info', text: '負擔比例只是自我預算檢視，不代表貸款機構的核貸結果。' });
    }
    if (result.status !== 'no-debt') {
      ev.charts.push(balanceChart(result.schedule, d.principal));
      ev.tables.push(scheduleTable(result.schedule, '逐月攤還表'));
      ev.csv = { filename: 'mortgage-schedule.csv', rows: scheduleCsv(result.schedule) };
    }
    ev.assumptions = [
      versionNote,
      '利率為名目年利率，月利率 = 年利率 ÷ 12；還款發生在每月月底，首期在滿一個月後支付，不依實際天數調整。',
      '分段利率變動時，本息平均攤還依當時剩餘本金與原到期日剩餘期數重算；本金平均攤還的每期本金維持不變。',
      '寬限期內只付利息，期間本金不變；寬限期包含在總期數內。',
      '一次性費用於期初支付，不併入貸款本金，也不計複利。',
      '未計入：房屋稅、火險／地震險、提前清償違約金、政府補貼、貸款機構個別規定及實際利率調整。',
      '範例數字均為虛構，僅供示範。',
    ];
    return ev;
  },
};
