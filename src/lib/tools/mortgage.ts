import { calculateMortgage, type MortgageInput, type MortgageInputMode } from '../calculators/mortgage';
import type { RateSegment, RepaymentMethod, ScheduleResult } from '../calculators/amortization';
import { formatPercent, formatTwd } from '../format';
import { FieldReader, type Values } from '../parse';
import type { Evaluation, ListSpec, TableSpec, ToolDef } from '../ui/types';
import { amountField, balanceChart, card, integerField, invalid, newEvaluation, percentField, scheduleCsv, scheduleTable, versionNote } from './shared';

const modeIs = (mode: MortgageInputMode) => (s: Values) => (s.inputMode ?? 'price-down') === mode;
const notMode = (mode: MortgageInputMode) => (s: Values) => (s.inputMode ?? 'price-down') !== mode;

const segmentsSpec: ListSpec = {
  key: 'segments',
  label: '分段利率設定（名目年利率）',
  itemLabel: '利率段',
  addLabel: '＋ 新增利率段',
  min: 1,
  max: 10,
  isAdvanced: true,
  hint: '第一段必須從第 1 個月開始；每段持續到下一段起始月份（或到期結算）。若為固定單一利率，只需一段。',
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
    fixedRate: '2.2',
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
    fixedRate: '',
    method: 'annuity',
    graceMonths: '',
    fee: '',
    monthlyIncome: '',
    otherMonthlyDebt: '',
    segments: [{ startMonth: '1', annualRate: '' }],
  };
}

/**
 * 依逐月 schedule 衍生「還款時段摘要」明細表格。
 * 每逢利率變動、寬限結束即切段，各列包含月份起迄、名目年利率、攤還狀態、月付金額/範圍、該段利息與段末餘額。
 */
export function buildRepaymentPeriods(schedule: ScheduleResult, graceMonths: number, method: RepaymentMethod): TableSpec {
  const rows = schedule.rows;
  const N = rows.length;
  if (N === 0) {
    return { caption: '還款時段摘要', columns: ['時段（月份）', '名目年利率', '攤還狀態', '每月月付金', '該段利息合計', '段末剩餘本金'], rows: [] };
  }

  const cuts = new Set<number>([1]);
  if (graceMonths > 0 && graceMonths < N) {
    cuts.add(graceMonths + 1);
  }
  for (let m = 2; m <= N; m += 1) {
    if (Math.abs(rows[m - 1].annualRate - rows[m - 2].annualRate) > 1e-7) {
      cuts.add(m);
    }
  }
  const cutList = Array.from(cuts).sort((a, b) => a - b);
  const tableRows: string[][] = [];

  for (let k = 0; k < cutList.length; k += 1) {
    const startM = cutList[k];
    const endM = k + 1 < cutList.length ? cutList[k + 1] - 1 : N;
    const periodRows = rows.slice(startM - 1, endM);

    let periodLabel = startM === endM ? `第 ${startM} 個月` : `第 ${startM}–${endM} 個月`;
    if (startM % 12 === 1 && endM % 12 === 0) {
      const startY = Math.floor((startM - 1) / 12) + 1;
      const endY = Math.floor(endM / 12);
      periodLabel += `（第 ${startY === endY ? `${startY}` : `${startY}–${endY}`} 年）`;
    }

    const rateStr = `${(periodRows[0].annualRate * 100).toFixed(2).replace(/\.00$/, '')}%`;

    let statusStr: string;
    if (startM <= graceMonths) {
      statusStr = '寬限期（只繳息）';
    } else if (method === 'equal-principal') {
      statusStr = '本金均攤（遞減）';
    } else {
      statusStr = '本息均攤（固定）';
    }

    const pMin = Math.min(...periodRows.map((r) => r.payment));
    const pMax = Math.max(...periodRows.map((r) => r.payment));
    let paymentStr: string;
    if (Math.abs(pMax - pMin) < 0.005) {
      paymentStr = formatTwd(pMin);
    } else {
      paymentStr = `${formatTwd(pMin)} ~ ${formatTwd(pMax)}`;
    }

    const interestSum = periodRows.reduce((sum, r) => sum + r.interest, 0);
    const interestStr = formatTwd(interestSum);
    const endBalStr = formatTwd(periodRows[periodRows.length - 1].balance);

    tableRows.push([periodLabel, rateStr, statusStr, paymentStr, interestStr, endBalStr]);
  }

  let note: string | undefined = undefined;
  if (graceMonths > 0 && graceMonths < N) {
    const lastGracePay = rows[graceMonths - 1].payment;
    const postGracePay = rows[graceMonths].payment;
    const diff = postGracePay - lastGracePay;
    const rateChanged = Math.abs(rows[graceMonths].annualRate - rows[graceMonths - 1].annualRate) > 1e-7;

    let pctStr: string;
    if (lastGracePay === 0) {
      pctStr = '增幅不適用（寬限期月付為 0）';
    } else {
      pctStr = `增幅 +${((diff / lastGracePay) * 100).toFixed(1)}%`;
    }

    note = `寬限期結束後首期月付相較寬限期增加 ${formatTwd(diff)}（${pctStr}）。`;
    if (rateChanged) {
      note += ' 此差異同時包含利率變動與開始償還本金之共同影響。';
    }
  }

  return {
    caption: '還款時段摘要',
    columns: ['時段（月份）', '名目年利率', '攤還狀態', '每月月付金', '該段利息合計', '段末剩餘本金'],
    rows: tableRows,
    note,
  };
}

export const mortgageTool: ToolDef = {
  id: 'mortgage',
  scenarioNoun: '方案',
  maxScenarios: 3,
  topFields: [],
  scenarioFields: [
    // --- 基本輸入 (Basic Fields) ---
    {
      key: 'inputMode',
      label: '本金計算模式',
      kind: 'select',
      clearsHidden: true,
      options: [
        { value: 'price-down', label: '房價 + 頭期款' },
        { value: 'price-ltv', label: '房價 + 貸款成數' },
        { value: 'principal', label: '直接輸入貸款本金' },
      ],
      hint: '選擇以房價與成數/頭期款推估，或直接填寫貸款本金。',
    },
    { ...amountField('price', '房價'), visibleIf: notMode('principal') },
    { ...amountField('downPayment', '頭期款', { hint: '貸款本金 = 房價 − 頭期款' }), visibleIf: modeIs('price-down') },
    { ...percentField('ltv', '貸款成數', { hint: '貸款本金 = 房價 × 貸款成數，0–100%' }), visibleIf: modeIs('price-ltv') },
    { ...amountField('principal', '貸款本金'), visibleIf: modeIs('principal') },
    {
      ...integerField('termMonths', '貸款年限／期數', '年／個月', {
        hint: '可直接以整數年輸入（例如 30 年 = 360 個月；1–600 個月）。',
      }),
      unitToggle: { type: 'year-month', defaultUnit: 'year' },
    },
    {
      ...percentField('fixedRate', '固定年利率', { unit: '%/年', hint: '若為固定單一利率請在此輸入；若為多階段分段利率請於進階設定編輯。' }),
      visibleIf: (s) => !Array.isArray(s.segments) || s.segments.length <= 1,
    },
    // --- 進階設定 (Advanced Fields) ---
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
    {
      ...integerField('graceMonths', '寬限期（選填）', '年／個月', { hint: '只付利息的期數；留空表示 0（無寬限期）。' }),
      isAdvanced: true,
      unitToggle: { type: 'year-month', defaultUnit: 'month' },
    },
    { ...amountField('fee', '一次性開辦手續費（選填）', { hint: '期初支付，不併入貸款本金；留空表示 0。' }), isAdvanced: true },
    { ...amountField('monthlyIncome', '每月收入（選填）', { hint: '用於計算所得負擔比例 (DTI)；必須大於 0。' }), isAdvanced: true },
    { ...amountField('otherMonthlyDebt', '其他貸款月付金額（選填）', { hint: '用於綜合負擔比例；留空表示 0。' }), isAdvanced: true },
    segmentsSpec,
  ],
  blank: () => ({ scenarios: [blankScenario()] }),
  example: () => ({
    scenarios: [
      scenario('方案 1（範例）'),
      scenario('方案 2（範例：寬限期）', { graceMonths: '24', fixedRate: '2.0', segments: [{ startMonth: '1', annualRate: '2.0' }, { startMonth: '37', annualRate: '2.4' }] }),
    ],
  }),
  scenarioBadge(s: Values): string {
    const segments = Array.isArray(s.segments) ? (s.segments as Values[]) : [];
    if (segments.length === 1 && (segments[0]?.annualRate || s.fixedRate)) {
      const rate = segments[0]?.annualRate || s.fixedRate;
      return `年利率 ${rate}%`;
    }
    if (segments.length > 1) {
      const firstRate = segments[0]?.annualRate ?? '—';
      return `${segments.length}段利率（首段 ${firstRate}%）`;
    }
    return s.fixedRate ? `年利率 ${s.fixedRate}%` : '未設利率';
  },
  advancedSummary(s: Values): string {
    const parts: string[] = [];
    parts.push(s.method === 'equal-principal' ? '本金均攤' : '本息均攤');
    const grace = Number(s.graceMonths || 0);
    if (grace > 0) parts.push(`寬限期 ${grace} 個月`);
    const segments = Array.isArray(s.segments) ? (s.segments as Values[]) : [];
    if (segments.length > 1) {
      parts.push(`${segments.length}段利率`);
    }
    const fee = Number(String(s.fee || '0').replace(/,/g, ''));
    if (fee > 0) parts.push(`費用 ${formatTwd(fee)}`);
    return parts.join(' ｜ ');
  },
  syncFromA: {
    buttonLabel: '以方案 A 的基本條件套用至其他方案',
    description: '此操作將以方案 A 的本金計算模式、房價、頭期款、貸款成數、貸款本金、每月收入與其他貸款月付覆寫其他方案；各方案自訂之貸款年限、利率、攤還方式、寬限期與手續費將保留不變。',
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
  compareInputs(s: Values, ev: Evaluation): Array<{ label: string; value: string }> {
    const mode = s.inputMode ?? 'price-down';
    const modeLabel = mode === 'principal' ? '直接輸入貸款本金' : mode === 'price-ltv' ? '房價 + 貸款成數' : '房價 + 頭期款';
    const priceVal = mode !== 'principal' && s.price ? `${s.price} 元` : '—';
    const downVal = mode === 'price-down' && s.downPayment ? `${s.downPayment} 元` : '—';
    const ltvVal = mode === 'price-ltv' && s.ltv ? `${s.ltv}%` : '—';
    const principalCard = ev.cards.find((c) => c.compareKey === 'principal');
    const derivedPrincipal = principalCard?.value ?? (s.principal ? `${s.principal} 元` : '—');
    const term = s.termMonths ? `${s.termMonths} 個月（約 ${(Number(s.termMonths) / 12).toFixed(1).replace(/\.0$/, '')} 年）` : '—';

    const segments = Array.isArray(s.segments) ? (s.segments as Values[]) : [];
    let rateSummary: string;
    if (segments.length === 1) {
      rateSummary = `固定年利率 ${segments[0]?.annualRate || s.fixedRate || '—'}%`;
    } else if (segments.length > 1) {
      rateSummary = segments.map((seg, idx) => `第${idx + 1}段(${seg.startMonth}月起): ${seg.annualRate}%`).join('；');
    } else {
      rateSummary = s.fixedRate ? `固定年利率 ${s.fixedRate}%` : '—';
    }

    const methodLabel = s.method === 'equal-principal' ? '本金平均攤還' : '本息平均攤還';
    const graceVal = Number(s.graceMonths || 0) > 0 ? `${s.graceMonths} 個月` : '無寬限期';
    const feeVal = Number(String(s.fee || '0').replace(/,/g, '')) > 0 ? `${s.fee} 元` : '無手續費';
    const incomeVal = s.monthlyIncome ? `${s.monthlyIncome} 元/月` : '未填寫';
    const otherDebtVal = Number(String(s.otherMonthlyDebt || '0').replace(/,/g, '')) > 0 ? `${s.otherMonthlyDebt} 元/月` : '無其他債務';

    return [
      { label: '本金計算模式', value: modeLabel },
      { label: '房屋總價', value: priceVal },
      { label: '頭期款', value: downVal },
      { label: '貸款成數', value: ltvVal },
      { label: '衍生貸款本金', value: derivedPrincipal },
      { label: '貸款期數／年限', value: term },
      { label: '利率設定', value: rateSummary },
      { label: '攤還方式', value: methodLabel },
      { label: '寬限期', value: graceVal },
      { label: '一次性費用', value: feeVal },
      { label: '每月收入', value: incomeVal },
      { label: '其他月債務', value: otherDebtVal },
    ];
  },
  evaluate(values): Evaluation {
    const r = new FieldReader(values);
    const mode = r.choice<MortgageInputMode>('inputMode');

    // 處理固定單一利率與分段利率同步
    const rawSegments = r.list('segments');
    let segments: RateSegment[];
    if (rawSegments.length > 1) {
      segments = rawSegments.map((_, i) => {
        const item = r.item('segments', i);
        return { startMonth: item.number('startMonth'), annualRate: item.percent('annualRate') };
      });
    } else {
      let rateNum: number;
      const fixedRateInput = typeof values.fixedRate === 'string' && values.fixedRate.trim() !== '' ? values.fixedRate : undefined;
      if (fixedRateInput !== undefined) {
        rateNum = r.percent('fixedRate');
      } else if (rawSegments.length === 1) {
        rateNum = r.item('segments', 0).percent('annualRate');
      } else {
        rateNum = r.percent('fixedRate');
      }
      segments = [{ startMonth: 1, annualRate: rateNum }];
    }

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
    if (rawSegments.length <= 1) {
      if (errors['segments.0.annualRate']) {
        errors.fixedRate = errors['segments.0.annualRate'];
      }
      if (typeof values.fixedRate === 'string' && values.fixedRate.trim() === '') {
        errors.fixedRate = '請輸入固定年利率';
      }
    }
    if (Object.keys(errors).length > 0 || !result.schedule?.summary || !result.derived) return invalid(errors);

    const ev = newEvaluation();
    const s = result.schedule.summary;
    const d = result.derived;
    const g = input.graceMonths;
    const method = input.method;

    if (result.status === 'no-debt') {
      ev.notices.push({ tone: 'info', text: '貸款本金為 0：沒有分期付款與利息。若有輸入一次性費用，仍列於總支出。' });
      ev.cards.push(
        card('一般月付金', formatTwd(0), {
          isCore: true,
          compare: true,
          compareKey: 'firstPayment',
          compareLabel: '首期月付金',
          note: '無貸款',
        }),
        card('總利息支出', formatTwd(0), {
          isCore: true,
          compare: true,
          compareKey: 'totalInterest',
          note: '無貸款利息',
        }),
        card('含費用總支出', formatTwd(s.totalCost), {
          isCore: true,
          compare: true,
          compareKey: 'totalCost',
          note: s.fee > 0 ? `包含手續費 ${formatTwd(s.fee)}` : '無貸款與費用',
        }),
      );
      ev.cards.push(card('貸款本金', formatTwd(0), { compare: true, compareKey: 'principal' }));
      if (s.fee > 0) ev.cards.push(card('一次性費用', formatTwd(s.fee)));
      return ev;
    }

    // 寬限期與攤還期間月付金狀態分析
    const postGrace = result.schedule.rows.slice(g);
    const postGraceIsConstant = postGrace.every((row) => Math.abs(row.payment - postGrace[0].payment) < 0.005);
    const graceRows = result.schedule.rows.slice(0, g);
    const graceMin = graceRows.length > 0 ? Math.min(...graceRows.map((r) => r.payment)) : 0;
    const graceMax = graceRows.length > 0 ? Math.max(...graceRows.map((r) => r.payment)) : 0;
    const graceSummaryText = graceRows.length > 0
      ? (Math.abs(graceMax - graceMin) < 0.005 ? `寬限期內月付 ${formatTwd(graceMin)}（只付利息）` : `寬限期內月付 ${formatTwd(graceMin)} ~ ${formatTwd(graceMax)}（隨利率變動）`)
      : '';

    // --- 前三項核心重點結果卡片 (Core Cards) ---
    if (g > 0) {
      if (postGraceIsConstant) {
        ev.cards.push(
          card('寬限後月付金', formatTwd(s.postGraceFirstPayment), {
            isCore: true,
            compare: true,
            compareKey: 'firstPayment',
            compareLabel: '首期月付金',
            note: graceSummaryText,
          }),
        );
      } else {
        ev.cards.push(
          card('月付金範圍（寬限後遞減）', `${formatTwd(s.minPayment)} ~ ${formatTwd(s.maxPayment)}`, {
            isCore: true,
            compare: true,
            compareKey: 'firstPayment',
            compareLabel: '首期月付金',
            note: `${graceSummaryText}；寬限後首期 ${formatTwd(s.postGraceFirstPayment)}，最高 ${formatTwd(s.maxPayment)}`,
          }),
        );
      }
    } else {
      if (s.paymentIsConstant) {
        ev.cards.push(
          card('一般月付金', formatTwd(s.firstPayment), {
            isCore: true,
            compare: true,
            compareKey: 'firstPayment',
            compareLabel: '首期月付金',
            note: '每月固定還款（本息均攤）',
          }),
        );
      } else {
        ev.cards.push(
          card('月付金範圍（遞減）', `${formatTwd(s.minPayment)} ~ ${formatTwd(s.maxPayment)}`, {
            isCore: true,
            compare: true,
            compareKey: 'firstPayment',
            compareLabel: '首期月付金',
            note: `首期 ${formatTwd(s.firstPayment)}，末期 ${formatTwd(result.schedule.rows[result.schedule.rows.length - 1].payment)}`,
          }),
        );
      }
    }

    ev.cards.push(
      card('總利息支出', formatTwd(s.totalInterest), {
        isCore: true,
        compare: true,
        compareKey: 'totalInterest',
        note: '依攤還期間逐期利息累計',
      }),
      card('含費用總支出', formatTwd(s.totalCost), {
        isCore: true,
        compare: true,
        compareKey: 'totalCost',
        note: `償還本金 ${formatTwd(s.totalPrincipal)} + 利息與手續費（不含頭期款、稅金、保險等購屋成本）`,
      }),
    );

    // --- 次要結果卡片 (Secondary Cards) ---
    if (d.price !== null && d.downPayment !== null) {
      ev.cards.push(
        card('房價總額', formatTwd(d.price)),
        card('頭期款', formatTwd(d.downPayment), { note: '頭期款不計入貸款利息' }),
      );
    }
    ev.cards.push(card('貸款本金', formatTwd(d.principal), { compare: true, compareKey: 'principal' }));

    // 明確列出首期月付金（非中段估算）與最高月付金
    ev.cards.push(
      card('首期月付金', formatTwd(s.firstPayment), {
        compare: true,
        compareKey: 'firstPayment',
        note: g > 0 ? '寬限期內只付利息' : !s.paymentIsConstant ? '本金平均攤還首期金額最高' : undefined,
      }),
      card('最高月付金', formatTwd(s.maxPayment), {
        compare: true,
        compareKey: 'maxPayment',
      }),
    );

    if (g > 0) {
      const lastGracePay = result.schedule.rows[g - 1].payment;
      const diff = s.postGraceFirstPayment - lastGracePay;
      ev.cards.push(
        card('寬限期月付金', Math.abs(graceMax - graceMin) < 0.005 ? formatTwd(graceMin) : `${formatTwd(graceMin)} ~ ${formatTwd(graceMax)}`, {
          note: '寬限期間只繳利息，不還本金',
        }),
        card('寬限期結束後首期月付金', formatTwd(s.postGraceFirstPayment), {
          compare: true,
          compareKey: 'postGracePayment',
          compareLabel: '寬限期後首期月付金',
          note: `相較寬限期末月付增加 ${formatTwd(diff)}`,
        }),
      );
    }

    if (!s.paymentIsConstant) {
      ev.notices.push({
        tone: 'info',
        text: `月付金會變動，範圍約 ${formatTwd(s.minPayment)} 至 ${formatTwd(s.maxPayment)}；請參考下方時段摘要與逐月表，不要用單一月付代表全部期數。`,
      });
    }

    if (s.fee > 0) {
      ev.cards.push(card('一次性費用', formatTwd(s.fee)));
    }

    if (result.burdenRatio !== null) {
      ev.cards.push(
        card('所得負擔比 (DTI)', formatPercent(result.burdenRatio, 1), {
          compare: true,
          compareKey: 'dti',
          compareLabel: '所得負擔比 (DTI)',
          note: '（最高月付金 + 其他貸款月付金）÷ 月收入',
          tone: result.burdenRatio > 0.5 ? 'warn' : 'neutral',
        }),
      );
      ev.notices.push({ tone: 'info', text: '所得負擔比僅供個人財務健康檢視，不代表銀行實際核貸准駁或利率條件。' });
    }

    // 走勢圖與時段摘要表格
    ev.charts.push(balanceChart(result.schedule, d.principal));
    ev.tables.push(buildRepaymentPeriods(result.schedule, g, method));
    ev.tables.push(scheduleTable(result.schedule, '逐月攤還表'));
    ev.csv = { filename: 'mortgage-schedule.csv', rows: scheduleCsv(result.schedule) };

    ev.assumptions = [
      versionNote,
      '利率為名目年利率，月利率 = 年利率 ÷ 12；還款發生在每月月底，首期在滿一個月後支付，不依實際天數調整。',
      '分段利率變動時，本息平均攤還依當時剩餘本金與原到期日剩餘期數重算；本金平均攤還的每期本金維持不變。',
      '寬限期內只付利息，期間本金不變；寬限期包含在總期數內。',
      '一次性費用於期初支付，不併入貸款本金，也不計複利。',
      '總支出不含頭期款、房屋稅、契稅、代書費、火險／地震險、提前清償違約金或政府補貼。',
      '範例數字均為虛構，僅供示範。',
    ];
    return ev;
  },
};
