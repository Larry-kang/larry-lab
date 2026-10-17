import { MAX_AMOUNT, isFiniteNumber, rangeError, type FieldErrors } from './common';

// ---------- Allocation / stress ----------

export interface PortfolioAsset {
  name: string;
  category: string;
  value: number;
  /** Single price change as a decimal (-0.2 = -20%). */
  shock: number;
}

export interface PortfolioLoan {
  name: string;
  principal: number;
  annualRate: number;
}

export interface AllocationInput {
  assets: PortfolioAsset[];
  loans: PortfolioLoan[];
}

export interface AssetRow {
  name: string;
  category: string;
  value: number;
  /** null when total assets are 0. */
  weight: number | null;
  shock: number;
  stressedValue: number;
}

export interface AllocationResult {
  status: 'valid' | 'invalid' | 'no-equity';
  errors: FieldErrors;
  gross: number | null;
  debt: number | null;
  equity: number | null;
  debtRatio: number | null;
  leverage: number | null;
  annualInterest: number | null;
  monthlyInterest: number | null;
  stressGross: number | null;
  stressEquity: number | null;
  equityChange: number | null;
  equityReturn: number | null;
  stressEquityNegative: boolean;
  rows: AssetRow[];
}

const emptyAllocation = (errors: FieldErrors): AllocationResult => ({
  status: 'invalid',
  errors,
  gross: null,
  debt: null,
  equity: null,
  debtRatio: null,
  leverage: null,
  annualInterest: null,
  monthlyInterest: null,
  stressGross: null,
  stressEquity: null,
  equityChange: null,
  equityReturn: null,
  stressEquityNegative: false,
  rows: [],
});

export function calculateAllocation(input: AllocationInput): AllocationResult {
  const errors: FieldErrors = {};
  const set = (key: string, message: string | undefined) => {
    if (message && !errors[key]) errors[key] = message;
  };
  if (input.assets.length < 1 || input.assets.length > 20) errors.assets = '資產須為 1–20 筆';
  if (input.loans.length > 10) errors.loans = '貸款最多 10 筆';
  input.assets.forEach((asset, i) => {
    set(`assets.${i}.value`, rangeError(asset.value, '資產金額', 0, MAX_AMOUNT, { unit: ' 元' }));
    set(
      `assets.${i}.shock`,
      rangeError(isFiniteNumber(asset.shock) ? asset.shock * 100 : undefined, '漲跌幅', -100, 100, { unit: '%' }),
    );
  });
  input.loans.forEach((loan, i) => {
    set(`loans.${i}.principal`, rangeError(loan.principal, '貸款本金', 0, MAX_AMOUNT, { unit: ' 元' }));
    set(
      `loans.${i}.annualRate`,
      rangeError(isFiniteNumber(loan.annualRate) ? loan.annualRate * 100 : undefined, '年利率', 0, 100, { unit: '%' }),
    );
  });
  if (Object.keys(errors).length > 0) return emptyAllocation(errors);

  const gross = input.assets.reduce((sum, a) => sum + a.value, 0);
  const debt = input.loans.reduce((sum, l) => sum + l.principal, 0);
  const equity = gross - debt;
  const annualInterest = input.loans.reduce((sum, l) => sum + l.principal * l.annualRate, 0);
  const rows: AssetRow[] = input.assets.map((a) => ({
    name: a.name,
    category: a.category,
    value: a.value,
    weight: gross > 0 ? a.value / gross : null,
    shock: a.shock,
    stressedValue: a.value * (1 + a.shock),
  }));
  const stressGross = rows.reduce((sum, r) => sum + r.stressedValue, 0);
  const stressEquity = stressGross - debt;
  const equityChange = stressEquity - equity;
  const equityPositive = equity > 0;
  return {
    status: equityPositive ? 'valid' : 'no-equity',
    errors: {},
    gross,
    debt,
    equity,
    debtRatio: gross > 0 ? debt / gross : null,
    leverage: equityPositive ? gross / equity : null,
    annualInterest,
    monthlyInterest: annualInterest / 12,
    stressGross,
    stressEquity,
    equityChange,
    equityReturn: equityPositive ? equityChange / equity : null,
    stressEquityNegative: stressEquity < 0,
    rows,
  };
}

// ---------- Accumulation ----------

export interface AccumulationAsset {
  name: string;
  /** Target weight as a decimal. */
  weight: number;
  /** Effective annual total return (dividends included), decimal. */
  annualReturn: number;
}

export interface AccumulationInput {
  initial: number;
  monthlyContribution: number;
  years: number;
  assets: AccumulationAsset[];
}

export interface YearRow {
  year: number;
  contributed: number;
  value: number;
  gain: number;
}

export interface AccumulationResult {
  status: 'valid' | 'invalid';
  errors: FieldErrors;
  totalContributed: number | null;
  finalValue: number | null;
  gain: number | null;
  finalByAsset: number[];
  yearRows: YearRow[];
}

export const WEIGHT_TOLERANCE = 1e-6;

export function calculateAccumulation(input: AccumulationInput): AccumulationResult {
  const errors: FieldErrors = {};
  const set = (key: string, message: string | undefined) => {
    if (message && !errors[key]) errors[key] = message;
  };
  set('initial', rangeError(input.initial, '期初資產', 0, MAX_AMOUNT, { unit: ' 元' }));
  set('monthlyContribution', rangeError(input.monthlyContribution, '月投入', 0, MAX_AMOUNT, { unit: ' 元' }));
  set('years', rangeError(input.years, '累積年數', 1, 60, { integer: true, unit: ' 年' }));
  if (input.assets.length < 1 || input.assets.length > 20) errors.assets = '資產須為 1–20 筆';
  let weightSum = 0;
  input.assets.forEach((asset, i) => {
    set(
      `assets.${i}.weight`,
      rangeError(isFiniteNumber(asset.weight) ? asset.weight * 100 : undefined, '目標權重', 0, 100, { unit: '%' }),
    );
    set(
      `assets.${i}.annualReturn`,
      rangeError(isFiniteNumber(asset.annualReturn) ? asset.annualReturn * 100 : undefined, '年總報酬', -99, 100, { unit: '%' }),
    );
    if (isFiniteNumber(asset.weight)) weightSum += asset.weight;
  });
  if (!errors.assets && Math.abs(weightSum - 1) > WEIGHT_TOLERANCE) {
    errors.weightSum = `目標權重總和須等於 100%（目前為 ${(weightSum * 100).toFixed(4).replace(/\.?0+$/, '')}%）`;
  }
  if (Object.keys(errors).length > 0) {
    return { status: 'invalid', errors, totalContributed: null, finalValue: null, gain: null, finalByAsset: [], yearRows: [] };
  }

  const { initial: W, monthlyContribution: C, years: Y, assets } = input;
  const growth = assets.map((a) => Math.pow(1 + a.annualReturn, 1 / 12));
  let balances = assets.map((a) => W * a.weight);
  const yearRows: YearRow[] = [{ year: 0, contributed: W, value: W, gain: 0 }];
  for (let month = 1; month <= 12 * Y; month += 1) {
    balances = balances.map((b, j) => b * growth[j] + C * assets[j].weight);
    if (month % 12 === 0) {
      const total = balances.reduce((sum, b) => sum + b, 0);
      balances = assets.map((a) => total * a.weight);
      const contributed = W + month * C;
      yearRows.push({ year: month / 12, contributed, value: total, gain: total - contributed });
    }
  }
  const finalValue = balances.reduce((sum, b) => sum + b, 0);
  const totalContributed = W + 12 * Y * C;
  return {
    status: 'valid',
    errors: {},
    totalContributed,
    finalValue,
    gain: finalValue - totalContributed,
    finalByAsset: balances,
    yearRows,
  };
}
