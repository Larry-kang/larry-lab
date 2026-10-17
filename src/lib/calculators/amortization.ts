import {
  MAX_AMOUNT,
  MONEY_TOLERANCE,
  annuityPayment,
  isFiniteNumber,
  rangeError,
  type FieldErrors,
} from './common';

export type RepaymentMethod = 'annuity' | 'equal-principal';

export interface RateSegment {
  /** 1-based month in which this rate starts. */
  startMonth: number;
  /** Nominal annual rate as a decimal. */
  annualRate: number;
}

export interface ScheduleInput {
  principal: number;
  termMonths: number;
  segments: RateSegment[];
  method: RepaymentMethod;
  graceMonths: number;
  fee: number;
  /** Upper bound on termMonths (mortgage 600, personal loan 120). */
  maxTermMonths: number;
}

export interface ScheduleRow {
  month: number;
  annualRate: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface ScheduleSummary {
  firstPayment: number;
  maxPayment: number;
  minPayment: number;
  /** Payment in the middle of the repayment period (after the grace period). */
  regularPayment: number;
  /** Interest-only payment during the grace period (null if no grace period). */
  gracePayment: number | null;
  /** First payment after the grace period ends. */
  postGraceFirstPayment: number;
  paymentIsConstant: boolean;
  totalInterest: number;
  totalPrincipal: number;
  fee: number;
  /** Sum of payments plus the one-off fee. */
  totalCost: number;
}

export interface ScheduleResult {
  status: 'valid' | 'invalid' | 'no-debt';
  errors: FieldErrors;
  rows: ScheduleRow[];
  summary: ScheduleSummary | null;
}

export function validateSchedule(input: Partial<ScheduleInput>, requirePositivePrincipal: boolean): FieldErrors {
  const errors: FieldErrors = {};
  const set = (key: string, message: string | undefined) => {
    if (message && !errors[key]) errors[key] = message;
  };
  set('principal', rangeError(input.principal, '貸款本金', 0, MAX_AMOUNT, { unit: ' 元' }));
  if (requirePositivePrincipal && isFiniteNumber(input.principal) && input.principal <= 0) {
    errors.principal = '「貸款本金」必須大於 0';
  }
  const maxTerm = input.maxTermMonths ?? 600;
  set('termMonths', rangeError(input.termMonths, '貸款期數', 1, maxTerm, { integer: true, unit: ' 個月' }));
  set('fee', rangeError(input.fee, '一次性費用', 0, MAX_AMOUNT, { unit: ' 元' }));
  set('graceMonths', rangeError(input.graceMonths, '寬限期', 0, maxTerm, { integer: true, unit: ' 個月' }));
  if (
    isFiniteNumber(input.graceMonths) &&
    isFiniteNumber(input.termMonths) &&
    !errors.graceMonths &&
    !errors.termMonths &&
    input.graceMonths >= input.termMonths
  ) {
    errors.graceMonths = '寬限期必須短於總期數';
  }
  const segments = input.segments ?? [];
  if (segments.length === 0) {
    errors.segments = '請至少輸入一段利率';
  } else {
    const seen = new Set<number>();
    let previous = 0;
    segments.forEach((segment, index) => {
      const rateError = rangeError(segment.annualRate * 100, '年利率', 0, 100, { unit: '%' });
      if (rateError) errors[`segments.${index}.annualRate`] = rateError;
      if (!Number.isInteger(segment.startMonth) || !isFiniteNumber(segment.startMonth)) {
        errors[`segments.${index}.startMonth`] = '「起始月份」必須為整數';
        return;
      }
      if (index === 0 && segment.startMonth !== 1) {
        errors[`segments.${index}.startMonth`] = '第一段利率必須從第 1 個月開始';
      } else if (seen.has(segment.startMonth)) {
        errors[`segments.${index}.startMonth`] = '起始月份不可重複';
      } else if (segment.startMonth <= previous) {
        errors[`segments.${index}.startMonth`] = '起始月份須由小到大依序排列';
      } else if (isFiniteNumber(input.termMonths) && segment.startMonth > input.termMonths) {
        errors[`segments.${index}.startMonth`] = '起始月份不可超過貸款期數';
      }
      seen.add(segment.startMonth);
      previous = segment.startMonth;
    });
  }
  return errors;
}

function rateForMonth(segments: RateSegment[], month: number): number {
  let rate = segments[0]?.annualRate ?? 0;
  for (const segment of segments) {
    if (segment.startMonth <= month) rate = segment.annualRate;
    else break;
  }
  return rate;
}

/**
 * Build a month-end amortization schedule per docs/CALCULATION_CONTRACT.md section 2.
 * Pure function: no DOM / network access.
 */
export function buildSchedule(input: ScheduleInput, requirePositivePrincipal = false): ScheduleResult {
  const errors = validateSchedule(input, requirePositivePrincipal);
  if (Object.keys(errors).length > 0) {
    return { status: 'invalid', errors, rows: [], summary: null };
  }
  const { principal, termMonths: n, graceMonths: g, method, fee, segments } = input;
  if (principal === 0) {
    return {
      status: 'no-debt',
      errors: {},
      rows: [],
      summary: {
        firstPayment: 0,
        maxPayment: 0,
        minPayment: 0,
        regularPayment: 0,
        gracePayment: null,
        postGraceFirstPayment: 0,
        paymentIsConstant: true,
        totalInterest: 0,
        totalPrincipal: 0,
        fee,
        totalCost: fee,
      },
    };
  }

  const rows: ScheduleRow[] = [];
  let balance = principal;
  const repaymentMonths = n - g;
  for (let month = 1; month <= n; month += 1) {
    const annualRate = rateForMonth(segments, month);
    const i = annualRate / 12;
    const interest = balance * i;
    let principalPaid: number;
    let payment: number;
    if (month <= g) {
      principalPaid = 0;
      payment = interest;
    } else if (month === n) {
      principalPaid = balance;
      payment = balance + interest;
    } else if (method === 'annuity') {
      payment = annuityPayment(balance, i, n - month + 1);
      principalPaid = payment - interest;
    } else {
      principalPaid = principal / repaymentMonths;
      payment = principalPaid + interest;
    }
    balance -= principalPaid;
    if (month === n || Math.abs(balance) < 1e-9) balance = Math.max(0, balance);
    rows.push({ month, annualRate, payment, interest, principal: principalPaid, balance });
  }

  const payments = rows.map((row) => row.payment);
  const maxPayment = Math.max(...payments);
  const minPayment = Math.min(...payments);
  const postGrace = rows.slice(g);
  const regularPayment = postGrace[Math.floor(postGrace.length / 2)].payment;
  const totalInterest = rows.reduce((sum, row) => sum + row.interest, 0);
  const totalPrincipal = rows.reduce((sum, row) => sum + row.principal, 0);
  const totalPayment = payments.reduce((sum, p) => sum + p, 0);
  const paymentIsConstant = postGrace.every((row) => Math.abs(row.payment - postGrace[0].payment) < 0.005);

  return {
    status: 'valid',
    errors: {},
    rows,
    summary: {
      firstPayment: rows[0].payment,
      maxPayment,
      minPayment,
      regularPayment,
      gracePayment: g > 0 ? rows[0].payment : null,
      postGraceFirstPayment: rows[g].payment,
      paymentIsConstant,
      totalInterest,
      totalPrincipal,
      fee,
      totalCost: totalPayment + fee,
    },
  };
}

/** Reconciliation residual: balance after the final row (expected ~0). */
export function finalBalanceResidual(rows: ScheduleRow[]): number {
  return rows.length === 0 ? 0 : Math.abs(rows[rows.length - 1].balance);
}

export { MONEY_TOLERANCE };
