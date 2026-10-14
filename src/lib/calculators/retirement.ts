import { MAX_AMOUNT, MONEY_TOLERANCE, isFiniteNumber, rangeError, type FieldErrors } from './common';

export interface RetirementInput {
  currentAge: number;
  retireAge: number;
  endAge: number;
  /** Investable net assets, today's purchasing power (TWD). */
  assets: number;
  /** Monthly contribution while working (TWD, today's purchasing power). */
  monthlyContribution: number;
  /** Monthly spending in retirement (TWD, today's purchasing power). */
  monthlySpending: number;
  /** Optional monthly retirement income; requires incomeStartAge. */
  monthlyIncome: number;
  incomeStartAge?: number;
  /** Decimals. */
  inflation: number;
  returnBefore: number;
  returnAfter: number;
}

export interface MonthPoint {
  month: number;
  /** Age in whole years at the start of the month. */
  age: number;
  phase: 'work' | 'retirement';
  /** Balance at month end in today's purchasing power. */
  realBalance: number;
  nominalBalance: number;
}

export interface RetirementResult {
  status: 'valid' | 'invalid';
  errors: FieldErrors;
  /** Capital needed if retiring today (today's purchasing power). */
  requiredToday: number | null;
  /** Capital needed at the target age (still in today's purchasing power). */
  requiredAtRetire: number | null;
  projectedAtRetire: number | null;
  /** max(0, required - projected). */
  gap: number | null;
  /** Monthly saving that reaches the requirement; null when there is no accumulation period. */
  neededSaving: number | null;
  noAccumulation: boolean;
  /** Highest monthly spending supportable until the end age. */
  maxMonthlySpending: number | null;
  maxSpendingExceedsCap: boolean;
  earliestRetireAge: number | null;
  /** First age with insufficient funds for the chosen target age, or null. */
  firstShortfallAge: number | null;
  firstShortfallMonth: number | null;
  feasible: boolean;
  points: MonthPoint[];
}

export const MAX_MONTHLY_SPENDING = MAX_AMOUNT;

interface Params {
  A: number;
  R: number;
  H: number;
  W: number;
  C: number;
  E: number;
  I: number;
  K: number;
  p: number;
  b: number;
  a: number;
}

function qOf(nominal: number, inflation: number): number {
  return Math.exp((Math.log1p(nominal) - Math.log1p(inflation)) / 12);
}

function incomeAt(P: Params, month: number): number {
  const age = P.A + Math.floor((month - 1) / 12);
  return P.I > 0 && age >= P.K ? P.I : 0;
}

/** Backward recursion: capital needed at the end of month `fromMonth` to fund months fromMonth+1..M. */
function requiredAtMonth(P: Params, fromMonth: number, E: number): number {
  const M = 12 * (P.H - P.A);
  const qa = qOf(P.a, P.p);
  let balance = 0;
  for (let m = M; m > fromMonth; m -= 1) {
    balance = Math.max(0, (balance + E - incomeAt(P, m)) / qa);
  }
  return balance;
}

interface Simulation {
  points: MonthPoint[];
  projectedAtRetire: number;
  shortfallMonth: number | null;
}

function simulate(P: Params): Simulation {
  const M = 12 * (P.H - P.A);
  const Mr = 12 * (P.R - P.A);
  const qb = qOf(P.b, P.p);
  const qa = qOf(P.a, P.p);
  const inflationMonthly = Math.log1p(P.p) / 12;
  const points: MonthPoint[] = [];
  let balance = P.W;
  let projectedAtRetire = P.W;
  let shortfallMonth: number | null = null;
  points.push({ month: 0, age: P.A, phase: Mr === 0 ? 'retirement' : 'work', realBalance: balance, nominalBalance: balance });
  for (let m = 1; m <= M; m += 1) {
    const age = P.A + Math.floor((m - 1) / 12);
    let phase: 'work' | 'retirement' = 'work';
    if (m <= Mr) {
      balance = balance * qb + P.C;
      if (m === Mr) projectedAtRetire = balance;
    } else {
      phase = 'retirement';
      if (m - 1 === Mr && Mr === 0) projectedAtRetire = P.W;
      if (shortfallMonth === null) {
        const grown = balance * qa;
        const income = incomeAt(P, m);
        if (grown + income < P.E - MONEY_TOLERANCE) {
          shortfallMonth = m;
          balance = 0;
        } else {
          balance = Math.max(0, grown + income - P.E);
        }
      } else {
        balance = 0;
      }
    }
    points.push({
      month: m,
      age,
      phase,
      realBalance: balance,
      nominalBalance: balance * Math.exp(inflationMonthly * m),
    });
  }
  return { points, projectedAtRetire, shortfallMonth };
}

function annuityFactor(n: number, lnq: number): number {
  if (lnq === 0) return n;
  return Math.expm1(n * lnq) / Math.expm1(lnq);
}

export function validateRetirement(input: RetirementInput): FieldErrors {
  const errors: FieldErrors = {};
  const set = (key: string, message: string | undefined) => {
    if (message && !errors[key]) errors[key] = message;
  };
  set('currentAge', rangeError(input.currentAge, '目前年齡', 18, 120, { integer: true, unit: ' 歲' }));
  set('retireAge', rangeError(input.retireAge, '目標退休年齡', 18, 120, { integer: true, unit: ' 歲' }));
  set('endAge', rangeError(input.endAge, '規劃終止年齡', 18, 120, { integer: true, unit: ' 歲' }));
  if (!errors.currentAge && !errors.retireAge && input.retireAge < input.currentAge) {
    errors.retireAge = '目標退休年齡不可小於目前年齡';
  }
  if (!errors.retireAge && !errors.endAge && input.endAge <= input.retireAge) {
    errors.endAge = '規劃終止年齡必須大於目標退休年齡';
  }
  set('assets', rangeError(input.assets, '可投資淨資產', 0, MAX_AMOUNT, { unit: ' 元' }));
  set('monthlyContribution', rangeError(input.monthlyContribution, '月投入', 0, MAX_AMOUNT, { unit: ' 元' }));
  set('monthlySpending', rangeError(input.monthlySpending, '退休月支出', 0, MAX_AMOUNT, { unit: ' 元' }));
  set('monthlyIncome', rangeError(input.monthlyIncome, '退休月收入', 0, MAX_AMOUNT, { unit: ' 元' }));
  if (isFiniteNumber(input.monthlyIncome) && input.monthlyIncome > 0) {
    if (input.incomeStartAge === undefined) {
      errors.incomeStartAge = '有退休月收入時，請輸入開始領取年齡';
    } else {
      set('incomeStartAge', rangeError(input.incomeStartAge, '開始領取年齡', input.currentAge, input.endAge, { integer: true, unit: ' 歲' }));
    }
  } else if (input.incomeStartAge !== undefined) {
    set('incomeStartAge', rangeError(input.incomeStartAge, '開始領取年齡', 18, 120, { integer: true, unit: ' 歲' }));
  }
  const pct = (v: number) => (isFiniteNumber(v) ? v * 100 : undefined);
  set('inflation', rangeError(pct(input.inflation), '通膨率', 0, 20, { unit: '%' }));
  set('returnBefore', rangeError(pct(input.returnBefore), '退休前名目年報酬', -99, 100, { unit: '%' }));
  set('returnAfter', rangeError(pct(input.returnAfter), '退休後名目年報酬', -99, 100, { unit: '%' }));
  return errors;
}

function toParams(input: RetirementInput): Params {
  return {
    A: input.currentAge,
    R: input.retireAge,
    H: input.endAge,
    W: input.assets,
    C: input.monthlyContribution,
    E: input.monthlySpending,
    I: input.monthlyIncome,
    K: input.incomeStartAge ?? input.endAge,
    p: input.inflation,
    b: input.returnBefore,
    a: input.returnAfter,
  };
}

export function calculateRetirement(input: RetirementInput): RetirementResult {
  const errors = validateRetirement(input);
  if (Object.keys(errors).length > 0) {
    return {
      status: 'invalid',
      errors,
      requiredToday: null,
      requiredAtRetire: null,
      projectedAtRetire: null,
      gap: null,
      neededSaving: null,
      noAccumulation: false,
      maxMonthlySpending: null,
      maxSpendingExceedsCap: false,
      earliestRetireAge: null,
      firstShortfallAge: null,
      firstShortfallMonth: null,
      feasible: false,
      points: [],
    };
  }
  const P = toParams(input);
  const Mr = 12 * (P.R - P.A);
  const requiredToday = requiredAtMonth(P, 0, P.E);
  const requiredAtRetire = requiredAtMonth(P, Mr, P.E);
  const sim = simulate(P);
  const projectedAtRetire = sim.projectedAtRetire;
  const gap = Math.max(0, requiredAtRetire - projectedAtRetire);

  // Monthly saving needed to reach the requirement at the target age.
  let neededSaving: number | null = null;
  const noAccumulation = Mr === 0;
  if (!noAccumulation) {
    const lnq = (Math.log1p(P.b) - Math.log1p(P.p)) / 12;
    const q = Math.exp(lnq);
    const growth = Math.pow(q, Mr);
    neededSaving = Math.max(0, (requiredAtRetire - P.W * growth) / annuityFactor(Mr, lnq));
  }

  // Highest affordable monthly spending: bisection on the monotone requirement.
  let maxMonthlySpending: number;
  let maxSpendingExceedsCap = false;
  if (requiredAtMonth(P, Mr, MAX_MONTHLY_SPENDING) <= projectedAtRetire + 1e-9) {
    maxMonthlySpending = MAX_MONTHLY_SPENDING;
    maxSpendingExceedsCap = true;
  } else {
    let lo = 0;
    let hi = MAX_MONTHLY_SPENDING;
    for (let i = 0; i < 100 && hi - lo > 0.001; i += 1) {
      const mid = (lo + hi) / 2;
      if (requiredAtMonth(P, Mr, mid) <= projectedAtRetire + 1e-9) lo = mid;
      else hi = mid;
    }
    maxMonthlySpending = lo;
  }

  // Earliest feasible whole-year retirement age.
  let earliestRetireAge: number | null = null;
  for (let age = P.A; age < P.H; age += 1) {
    const trial = simulate({ ...P, R: age });
    if (trial.shortfallMonth === null) {
      earliestRetireAge = age;
      break;
    }
  }

  const shortfallAge = sim.shortfallMonth === null ? null : P.A + Math.floor((sim.shortfallMonth - 1) / 12);
  return {
    status: 'valid',
    errors: {},
    requiredToday,
    requiredAtRetire,
    projectedAtRetire,
    gap,
    neededSaving,
    noAccumulation,
    maxMonthlySpending,
    maxSpendingExceedsCap,
    earliestRetireAge,
    firstShortfallAge: shortfallAge,
    firstShortfallMonth: sim.shortfallMonth,
    feasible: sim.shortfallMonth === null,
    points: sim.points,
  };
}
