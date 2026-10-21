import { MODEL_UPDATED_AT, MODEL_VERSION } from '../calculators/common';
import { cents } from '../csv';
import { formatCents, formatPercent, formatTwd } from '../format';
import type { ScheduleResult } from '../calculators/amortization';
import type { Card, ChartSpec, Evaluation, FieldSpec, TableSpec } from '../ui/types';

export const amountField = (key: string, label: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  key,
  label,
  kind: 'amount',
  unit: '新台幣元',
  ...extra,
});

export const percentField = (key: string, label: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  key,
  label,
  kind: 'percent',
  unit: '%',
  ...extra,
});

export const integerField = (key: string, label: string, unit: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  key,
  label,
  kind: 'integer',
  unit,
  ...extra,
});

export const versionNote = `計算模型版本 ${MODEL_VERSION}（更新日期 ${MODEL_UPDATED_AT}）；幣別為新台幣（TWD）。`;

export function newEvaluation(): Evaluation {
  return { errors: {}, notices: [], cards: [], charts: [], tables: [], assumptions: [] };
}

export function invalid(errors: Record<string, string>): Evaluation {
  const ev = newEvaluation();
  ev.errors = errors;
  return ev;
}

export function card(label: string, value: string, extra: Partial<Card> = {}): Card {
  return { label, value, ...extra };
}

/** Balance chart shared by mortgage and personal loan. */
export function balanceChart(schedule: ScheduleResult, principal: number): ChartSpec {
  return {
    title: '剩餘本金變化',
    description: `貸款本金 ${formatTwd(principal)}，逐月償還後剩餘本金的走勢；等值數字見下方圖表資料表。`,
    xLabel: '期數（月）',
    yLabel: '剩餘本金（新台幣元）',
    yKind: 'twd',
    series: [{ name: '剩餘本金', points: [[0, principal], ...schedule.rows.map((r) => [r.month, r.balance] as [number, number])] }],
  };
}

export function scheduleTable(schedule: ScheduleResult, caption: string): TableSpec {
  return {
    caption,
    collapsed: true,
    columns: ['期數', '年利率', '月付金', '利息', '償還本金', '剩餘本金'],
    rows: schedule.rows.map((r) => [
      String(r.month),
      formatPercent(r.annualRate, 3),
      formatCents(r.payment),
      formatCents(r.interest),
      formatCents(r.principal),
      formatCents(r.balance),
    ]),
    note: '表內金額保留至分，僅在顯示時四捨五入；最後一期清償實際剩餘本金。',
  };
}

export function scheduleCsv(schedule: ScheduleResult): Array<Array<string | number>> {
  return [
    ['期數', '年利率（小數）', '月付金（TWD）', '利息（TWD）', '償還本金（TWD）', '剩餘本金（TWD）'],
    ...schedule.rows.map((r) => [r.month, r.annualRate, cents(r.payment), cents(r.interest), cents(r.principal), cents(r.balance)]),
  ];
}
