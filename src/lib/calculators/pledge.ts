import { MAX_AMOUNT, isFiniteNumber, rangeError, type FieldErrors } from './common';

export interface PledgeInput {
  /** Aggregated eligible collateral market value (TWD). */
  collateralValue: number;
  /** Illustrated loan-to-value limit as a decimal. */
  loanToValue: number;
  /** Actual borrowing (TWD); may exceed the illustrated limit for stress tests. */
  loanAmount: number;
  /** Nominal annual interest rate as a decimal. */
  annualRate: number;
  days: number;
  /** Warning maintenance ratio as a decimal (1.3 = 130%). */
  warningRatio: number;
  /** Restore target ratio, must be >= warningRatio. */
  targetRatio: number;
  /** Custom price shock as a decimal (-0.4 = -40%). */
  customShock: number;
}

export interface PledgeScenario {
  label: string;
  shock: number;
  collateral: number;
  /** null = not applicable (no debt). */
  maintenance: number | null;
  equity: number;
  belowWarning: boolean;
  cashRepaymentToTarget: number;
  additionalCollateralToTarget: number;
}

export interface PledgeResult {
  status: 'valid' | 'invalid' | 'no-debt';
  errors: FieldErrors;
  illustratedLimit: number | null;
  overIllustratedLimit: boolean;
  equity: number | null;
  maintenance: number | null;
  yearInterest: number | null;
  averageMonthlyInterest: number | null;
  termInterest: number | null;
  thresholdCollateral: number | null;
  /** Fraction the collateral may fall from today's value to reach the warning threshold. */
  dropToThreshold: number | null;
  atOrBelowThreshold: boolean;
  scenarios: PledgeScenario[];
}

export const PRESET_SHOCKS = [-0.1, -0.2, -0.3, -0.5];
const THRESHOLD_TOLERANCE = 1e-6;

export function evaluatePledgeScenario(input: PledgeInput, shock: number, label: string): PledgeScenario {
  const collateral = input.collateralValue * (1 + shock);
  const loan = input.loanAmount;
  const hasDebt = loan > 0;
  return {
    label,
    shock,
    collateral,
    maintenance: hasDebt ? collateral / loan : null,
    equity: collateral - loan,
    belowWarning: hasDebt && collateral - loan * input.warningRatio <= THRESHOLD_TOLERANCE,
    cashRepaymentToTarget: hasDebt ? Math.max(0, loan - collateral / input.targetRatio) : 0,
    additionalCollateralToTarget: hasDebt ? Math.max(0, loan * input.targetRatio - collateral) : 0,
  };
}

export function calculatePledge(input: PledgeInput): PledgeResult {
  const errors: FieldErrors = {};
  const set = (key: string, message: string | undefined) => {
    if (message) errors[key] = message;
  };
  set('collateralValue', rangeError(input.collateralValue, '擔保品市值', 0, MAX_AMOUNT, { unit: ' 元' }));
  set('loanToValue', rangeError(isFiniteNumber(input.loanToValue) ? input.loanToValue * 100 : undefined, '可貸成數', 0, 100, { unit: '%' }));
  set('loanAmount', rangeError(input.loanAmount, '實際借款', 0, MAX_AMOUNT, { unit: ' 元' }));
  set('annualRate', rangeError(isFiniteNumber(input.annualRate) ? input.annualRate * 100 : undefined, '年利率', 0, 100, { unit: '%' }));
  set('days', rangeError(input.days, '借款天數', 1, 3650, { integer: true, unit: ' 天' }));
  set('warningRatio', rangeError(isFiniteNumber(input.warningRatio) ? input.warningRatio * 100 : undefined, '警示維持率', 0.0001, 1000, { unit: '%' }));
  set('targetRatio', rangeError(isFiniteNumber(input.targetRatio) ? input.targetRatio * 100 : undefined, '補足目標維持率', 0.0001, 1000, { unit: '%' }));
  if (!errors.warningRatio && !errors.targetRatio && input.targetRatio < input.warningRatio) {
    errors.targetRatio = '「補足目標維持率」不可低於警示維持率';
  }
  set('customShock', rangeError(isFiniteNumber(input.customShock) ? input.customShock * 100 : undefined, '自訂漲跌幅', -100, 100, { unit: '%' }));
  if (Object.keys(errors).length > 0) {
    return {
      status: 'invalid',
      errors,
      illustratedLimit: null,
      overIllustratedLimit: false,
      equity: null,
      maintenance: null,
      yearInterest: null,
      averageMonthlyInterest: null,
      termInterest: null,
      thresholdCollateral: null,
      dropToThreshold: null,
      atOrBelowThreshold: false,
      scenarios: [],
    };
  }

  const V = input.collateralValue;
  const L = input.loanAmount;
  const hasDebt = L > 0;
  const illustratedLimit = V * input.loanToValue;
  const thresholdCollateral = L * input.warningRatio;
  const atOrBelowThreshold = hasDebt && V - thresholdCollateral <= THRESHOLD_TOLERANCE;
  let dropToThreshold: number | null = null;
  if (hasDebt && V > 0 && !atOrBelowThreshold) dropToThreshold = 1 - thresholdCollateral / V;

  const scenarios = [
    ...PRESET_SHOCKS.map((shock) => evaluatePledgeScenario(input, shock, `${round1(shock * 100)}%`)),
    evaluatePledgeScenario(input, input.customShock, `自訂 ${round1(input.customShock * 100)}%`),
  ];

  return {
    status: hasDebt ? 'valid' : 'no-debt',
    errors: {},
    illustratedLimit,
    overIllustratedLimit: L > illustratedLimit + THRESHOLD_TOLERANCE,
    equity: V - L,
    maintenance: hasDebt ? V / L : null,
    yearInterest: L * input.annualRate,
    averageMonthlyInterest: (L * input.annualRate) / 12,
    termInterest: (L * input.annualRate * input.days) / 365,
    thresholdCollateral: hasDebt ? thresholdCollateral : null,
    dropToThreshold,
    atOrBelowThreshold,
    scenarios,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
