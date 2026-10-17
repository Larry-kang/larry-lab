import { buildSchedule, type ScheduleResult } from './amortization';
import { MAX_AMOUNT, MONEY_TOLERANCE, rangeError, type FieldErrors } from './common';

export type FeeMode = 'deducted' | 'separate';

export interface PersonalLoanInput {
  principal: number;
  /** Nominal annual rate as a decimal. */
  annualRate: number;
  termMonths: number;
  fee: number;
  feeMode: FeeMode;
}

export interface PersonalLoanResult {
  status: 'valid' | 'invalid' | 'infeasible';
  errors: FieldErrors;
  message?: string;
  schedule: ScheduleResult | null;
  /** Principal minus fee: the net cash available at drawdown. */
  netProceeds: number | null;
  monthlyPayment: number | null;
  totalInterest: number | null;
  totalCost: number | null;
  /** Monthly internal rate of return of the cash flows. */
  monthlyIrr: number | null;
  /** Estimated effective annual cost, (1+x)^12-1. Not a legal APR. */
  effectiveAnnualCost: number | null;
}

function presentValue(payments: number[], x: number): number {
  let sum = 0;
  let factor = 1;
  const base = 1 + x;
  for (const payment of payments) {
    factor /= base;
    sum += payment * factor;
  }
  return sum;
}

/**
 * Solve net = sum(payment_m / (1+x)^m) for the monthly rate x >= 0.
 * Expands a bracket then bisects; returns null when no root exists.
 */
export function solveMonthlyIrr(netProceeds: number, payments: number[]): number | null {
  const total = payments.reduce((sum, p) => sum + p, 0);
  if (Math.abs(total - netProceeds) <= 1e-9) return 0;
  const f = (x: number) => presentValue(payments, x) - netProceeds;
  if (f(0) < 0) return null;
  let lo = 0;
  let hi = 0.01;
  let guard = 0;
  while (f(hi) > 0) {
    lo = hi;
    hi *= 2;
    guard += 1;
    if (guard > 80) return null;
  }
  for (let iteration = 0; iteration < 300; iteration += 1) {
    const mid = (lo + hi) / 2;
    const value = f(mid);
    if (Math.abs(value) <= 1e-6 || hi - lo < 1e-15) return mid;
    if (value > 0) lo = mid;
    else hi = mid;
  }
  const mid = (lo + hi) / 2;
  return Math.abs(f(mid)) <= MONEY_TOLERANCE ? mid : null;
}

export function calculatePersonalLoan(input: PersonalLoanInput): PersonalLoanResult {
  const empty = {
    schedule: null,
    netProceeds: null,
    monthlyPayment: null,
    totalInterest: null,
    totalCost: null,
    monthlyIrr: null,
    effectiveAnnualCost: null,
  };
  const errors: FieldErrors = {};
  const rateError = rangeError(input.annualRate * 100, '年利率', 0, 100, { unit: '%' });
  if (rateError) errors.annualRate = rateError;
  const schedule = buildSchedule(
    {
      principal: input.principal,
      termMonths: input.termMonths,
      segments: [{ startMonth: 1, annualRate: input.annualRate }],
      method: 'annuity',
      graceMonths: 0,
      fee: input.fee,
      maxTermMonths: 120,
    },
    true,
  );
  const merged: FieldErrors = { ...schedule.errors, ...errors };
  delete merged.segments;
  delete merged['segments.0.annualRate'];
  delete merged['segments.0.startMonth'];
  if (!errors.fee && Number.isFinite(input.fee) && Number.isFinite(input.principal) && input.fee >= input.principal) {
    merged.fee = '「費用」必須小於貸款本金';
  }
  if (input.principal > MAX_AMOUNT) merged.principal = merged.principal ?? '「貸款本金」超出範圍';
  if (Object.keys(merged).length > 0 || !schedule.summary) {
    return { ...empty, status: 'invalid', errors: merged };
  }

  const net = input.principal - input.fee;
  const payments = schedule.rows.map((row) => row.payment);
  const x = solveMonthlyIrr(net, payments);
  if (x === null) {
    return {
      ...empty,
      status: 'infeasible',
      errors: {},
      message: '無法依現金流求得有效年化成本，請調整輸入。',
      schedule,
      netProceeds: net,
    };
  }
  return {
    status: 'valid',
    errors: {},
    schedule,
    netProceeds: net,
    monthlyPayment: schedule.summary.firstPayment,
    totalInterest: schedule.summary.totalInterest,
    totalCost: schedule.summary.totalCost,
    monthlyIrr: x,
    effectiveAnnualCost: Math.expm1(12 * Math.log1p(x)),
  };
}
