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
  label: '分段利率（名目年利率）',
  itemLabel: '利率段',
  addLabel: '新增利率段',
  min: 1,
  max: 10,
  isAdvanced: true,
  hint: '第一段必須從第 1 個月開始；每段持續到下一段起始月份。若為固定單一利率，只需一段。',
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
    // --- 基本輸入 ---
    { ...amountField('price', '房價'), visibleIf: notMode('principal') },
    { ...amountField('downPayment', '頭期款', { hint: '貸款本金 = 房價 − 頭期款' }), visibleIf: modeIs('price-down') },
    { ...percentField('ltv', '貸款成數', { hint: '貸款本金 = 房價 × 貸款成數，0–100%' }), visibleIf: modeIs('price-ltv') },
    { ...amountField('principal', '貸款本金'), visibleIf: modeIs('principal') },
    integerField('termMonths', '貸款年限／期數', '個月', { hint: '例如 30 年 = 360 個月；1–600 個月。' }),
    // --- 進階設定 ---
    {
      key: 'inputMode',
      label: '本金計算模式',
      kind: 'select',
      clearsHidden: true,
      isAdvanced: true,
      options: [
        { value: 'price-down', label: '房價 + 頭期款' },
        { value: 'price-ltv', label: '房價 + 貸款成數' },
        { value: 'principal', label: '直接輸入貸款本金' },
      ],
      hint: '切換模式會清除衝突欄位，保持本金與頭期款一致。',
    },
    {
      key: 'method',
      label: '攤還方式',
      kind: 'select',
      isAdvanced: true,
      options: [
        { value: 'annuity', label: '本息平均攤還（每月還款固定）' },
        { value: 'equal-principal', label: '本金平均攤還（每月本金固定，月付遞減）' },
      ],
    },
    { ...integerField('graceMonths', '寬限期（選填）', '個月', { hint: '只付利息的月數；留空表示 0（無寬限期）。' }), isAdvanced: true },
    { ...amountField('fee', '一次性開辦手續費（選填）', { hint: '期初支付，不併入貸款本金；留空表示 0。' }), isAdvanced: true },
    { ...amountField('monthlyIncome', '每月收入（選填）', { hint: '用於計算所得負擔比例 (DTI)；必須大於 0。' }), isAdvanced: true },
    { ...amountField('otherMonthlyDebt', '其他貸款月付金額（選填）', { hint: '用於綜合負擔比例；留空表示 0。' }), isAdvanced: true },
    segmentsSpec,
  ],
  blank: () => ({ scenarios: [blankScenario()] }),
  example: () => ({
    scenarios: [
      scenario('方案 1（範例）'),
      scenario('方案 2（範例：寬限期）', { graceMonths: '24', segments: [{ startMonth: '1', annualRate: '2.0' }, { startMonth: '37', annualRate: '2.4' }] }),
    ],
  }),
  scenarioBadge(s: Values): string {
    const segments = Array.isArray(s.segments) ? (s.segments as Values[]) : [];
    if (segments.length === 1 && segments[0]?.annualRate) {
      return `年利率 ${segments[0].annualRate}%`;
    }
    if (segments.length > 1) {
      const firstRate = segments[0]?.annualRate ?? '—';
      return `${segments.length}段利率（首段 ${firstRate}%）`;
    }
    return '未設利率';
  },
  advancedSummary(s: Values): string {
    const parts: string[] = [];
    parts.push(s.method === 'equal-principal' ? '本金均攤' : '本息均攤');
    const grace = Number(s.graceMonths || 0);
    if (grace > 0) parts.push(`寬限期 ${grace} 個月`);
    const fee = Number(String(s.fee || '0').replace(/,/g, ''));
    if (fee > 0) parts.push(`費用 ${formatTwd(fee)}`);
    return parts.join(' ｜ ');
  },
  syncFromA: {
    buttonLabel: '以方案 A 的基本條件套用至其他方案',
    description: '此操作將以方案 A 的房價、頭期款/本金模式、月收入與其他債務覆寫其他方案；各方案之利率、期數、攤還方式、寬限期與費用將保留不變。',
    apply(target: Values, sourceA: Values) {
      target.inputMode = sourceA.inputMode;
      target.price = sourceA.price;
      target.downPayment = sourceA.downPayment;
      target.ltv = sourceA.ltv;
      target.principal = sourceA.principal;
      target.monthlyIncome = sourceA.monthlyIncome;
      target.otherMonthlyDebt = sourceA.otherMonthlyDebt;
    },
  },
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

    // 核心前三項結果 (Core Cards)
    if (result.status !== 'no-debt') {
      const paymentLabel = s.paymentIsConstant ? '一般月付金' : '首期月付金（會變動）';
      ev.cards.push(
        card(paymentLabel, formatTwd(s.regularPayment || s.firstPayment), {
          isCore: true,
          compare: true,
          note: s.gracePayment !== null ? `寬限期內月付 ${formatTwd(s.gracePayment)}` : s.paymentIsConstant ? undefined : `範圍約 ${formatTwd(s.minPayment)} 至 ${formatTwd(s.maxPayment)}`,
        }),
      );
    } else {
      ev.cards.push(card('一般月付金', formatTwd(0), { isCore: true, compare: true, note: '無貸款' }));
    }
    ev.cards.push(
      card('總利息支出', formatTwd(s.totalInterest), { isCore: true, compare: true, note: '依攤還期間逐期利息累計' }),
      card('含費用總支出', formatTwd(s.totalCost), { isCore: true, compare: true, note: `償還本金 ${formatTwd(s.totalPrincipal)} + 利息與手續費` }),
    );

    // 次要結果卡片 (Secondary Cards)
    if (d.price !== null && d.downPayment !== null) {
      ev.cards.push(card('房價總額', formatTwd(d.price)), card('頭期款', formatTwd(d.downPayment), { note: '頭期款不計入貸款利息' }));
    }
    ev.cards.push(card('貸款本金', formatTwd(d.principal), { compare: true }));

    if (result.status !== 'no-debt') {
      ev.cards.push(
        card('首期月付金', formatTwd(s.firstPayment), { compare: true, note: s.gracePayment !== null ? '寬限期內只付利息' : undefined }),
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

    if (s.fee > 0) {
      ev.cards.push(card('一次性費用', formatTwd(s.fee)));
    }

    if (result.burdenRatio !== null) {
      ev.cards.push(
        card('所得負擔比 (DTI)', formatPercent(result.burdenRatio, 1), {
          compare: true,
          note: '（最高月付金 + 其他貸款月付金）÷ 月收入',
          tone: result.burdenRatio > 0.5 ? 'warn' : 'neutral',
        }),
      );
      ev.notices.push({ tone: 'info', text: '所得負擔比僅供個人財務健康檢視，不代表銀行實際核貸准駁或利率條件。' });
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
