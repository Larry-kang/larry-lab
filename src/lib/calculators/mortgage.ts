import { buildSchedule, type RateSegment, type RepaymentMethod, type ScheduleResult } from './amortization';
import { MAX_AMOUNT, rangeError, isFiniteNumber, type FieldErrors } from './common';

export type MortgageInputMode = 'principal' | 'price-down' | 'price-ltv';

export interface MortgageInput {
  mode: MortgageInputMode;
  principal?: number;
  price?: number;
  downPayment?: number;
  /** Loan-to-value as a decimal (0.8 = 80%). */
  ltv?: number;
  termMonths: number;
  segments: RateSegment[];
  method: RepaymentMethod;
  graceMonths: number;
  fee: number;
  monthlyIncome?: number;
  otherMonthlyDebt?: number;
}

export interface MortgageDerived {
  price: number | null;
  downPayment: number | null;
  principal: number;
}

export interface MortgageResult {
  status: 'valid' | 'invalid' | 'no-debt';
  errors: FieldErrors;
  derived: MortgageDerived | null;
  schedule: ScheduleResult | null;
  /** (max payment + other debt) / income, or null when income is not provided. */
  burdenRatio: number | null;
}

export function calculateMortgage(input: MortgageInput): MortgageResult {
  const errors: FieldErrors = {};
  let principal: number | undefined;
  let price: number | null = null;
  let downPayment: number | null = null;

  if (input.mode === 'principal') {
    const e = rangeError(input.principal, '貸款本金', 0, MAX_AMOUNT, { unit: ' 元' });
    if (e) errors.principal = e;
    principal = input.principal;
  } else {
    const priceError = rangeError(input.price, '房價', 0, MAX_AMOUNT, { unit: ' 元' });
    if (priceError) errors.price = priceError;
    else if ((input.price as number) <= 0) errors.price = '「房價」必須大於 0';
    if (input.mode === 'price-down') {
      const e = rangeError(input.downPayment, '頭期款', 0, MAX_AMOUNT, { unit: ' 元' });
      if (e) errors.downPayment = e;
      else if (!errors.price && (input.downPayment as number) > (input.price as number)) {
        errors.downPayment = '「頭期款」不可高於房價';
      }
      if (!errors.price && !errors.downPayment) {
        price = input.price as number;
        downPayment = input.downPayment as number;
        principal = price - downPayment;
      }
    } else {
      const e = rangeError(
        isFiniteNumber(input.ltv) ? input.ltv * 100 : undefined,
        '貸款成數',
        0,
        100,
        { unit: '%' },
      );
      if (e) errors.ltv = e;
      if (!errors.price && !errors.ltv) {
        price = input.price as number;
        principal = price * (input.ltv as number);
        downPayment = price - principal;
      }
    }
  }

  if (input.monthlyIncome !== undefined) {
    if (!isFiniteNumber(input.monthlyIncome) || input.monthlyIncome <= 0 || input.monthlyIncome > MAX_AMOUNT) {
      errors.monthlyIncome = '「月收入」必須大於 0 且不超過 10 億元';
    }
  }
  if (input.otherMonthlyDebt !== undefined) {
    const e = rangeError(input.otherMonthlyDebt, '其他貸款月付金', 0, MAX_AMOUNT, { unit: ' 元' });
    if (e) errors.otherMonthlyDebt = e;
  }

  const schedule = buildSchedule({
    principal: principal ?? Number.NaN,
    termMonths: input.termMonths,
    segments: input.segments,
    method: input.method,
    graceMonths: input.graceMonths,
    fee: input.fee,
    maxTermMonths: 600,
  });
  const scheduleErrors = { ...schedule.errors };
  if (input.mode !== 'principal') delete scheduleErrors.principal;
  const merged: FieldErrors = { ...scheduleErrors, ...errors };
  if (Object.keys(merged).length > 0) {
    return { status: 'invalid', errors: merged, derived: null, schedule: null, burdenRatio: null };
  }

  let burdenRatio: number | null = null;
  if (input.monthlyIncome !== undefined && schedule.summary) {
    burdenRatio = (schedule.summary.maxPayment + (input.otherMonthlyDebt ?? 0)) / input.monthlyIncome;
  }
  return {
    status: schedule.status === 'no-debt' ? 'no-debt' : 'valid',
    errors: {},
    derived: { price, downPayment, principal: principal as number },
    schedule,
    burdenRatio,
  };
}
