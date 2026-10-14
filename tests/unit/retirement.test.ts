import { describe, expect, it } from 'vitest';
import { calculateRetirement, type RetirementInput } from '../../src/lib/calculators/retirement';

const ret = (overrides: Partial<RetirementInput> = {}): RetirementInput => ({
  currentAge: 59,
  retireAge: 60,
  endAge: 61,
  assets: 60000,
  monthlyContribution: 5000,
  monthlySpending: 10000,
  monthlyIncome: 0,
  incomeStartAge: undefined,
  inflation: 0,
  returnBefore: 0,
  returnAfter: 0,
  ...overrides,
});

describe('retirement contract examples', () => {
  it('example 1: A=59 R=60 H=61', () => {
    const r = calculateRetirement(ret());
    expect(r.status).toBe('valid');
    expect(r.projectedAtRetire).toBeCloseTo(120000, 4);
    expect(r.requiredAtRetire).toBeCloseTo(120000, 4);
    expect(r.requiredToday).toBeCloseTo(240000, 4);
    expect(r.gap).toBeCloseTo(0, 4);
    expect(r.neededSaving).toBeCloseTo(5000, 4);
    expect(r.maxMonthlySpending).toBeCloseTo(10000, 1);
    expect(r.earliestRetireAge).toBe(60);
    expect(r.firstShortfallAge).toBeNull();
    expect(r.feasible).toBe(true);
  });

  it('example 2: income from 61 lowers the requirement to 192,000', () => {
    const base = ret({ currentAge: 60, retireAge: 60, endAge: 62, assets: 0, monthlyContribution: 0, monthlyIncome: 4000, incomeStartAge: 61 });
    const r = calculateRetirement(base);
    expect(r.requiredAtRetire).toBeCloseTo(192000, 4);
    expect(r.requiredToday).toBeCloseTo(192000, 4);
    expect(r.feasible).toBe(false);
    expect(r.firstShortfallMonth).toBe(1);
    expect(r.firstShortfallAge).toBe(60);
    const exact = calculateRetirement({ ...base, assets: 192000 });
    expect(exact.feasible).toBe(true);
    expect(exact.firstShortfallAge).toBeNull();
    expect(exact.points.at(-1)!.realBalance).toBeCloseTo(0, 2);
  });

  it('example 3: exactly funded vs 10,000 short; no accumulation period', () => {
    const base = ret({ currentAge: 60, retireAge: 60, endAge: 61, assets: 120000, monthlyContribution: 0 });
    const ok = calculateRetirement(base);
    expect(ok.feasible).toBe(true);
    expect(ok.noAccumulation).toBe(true);
    expect(ok.neededSaving).toBeNull();
    const short = calculateRetirement({ ...base, assets: 110000 });
    expect(short.feasible).toBe(false);
    expect(short.firstShortfallMonth).toBe(12);
    expect(short.gap).toBeCloseTo(10000, 4);
    expect(short.points.at(-1)!.realBalance).toBe(0);
  });

  it('example 4: nominal return equal to inflation gives zero real growth', () => {
    const r = calculateRetirement(ret({ inflation: 0.03, returnBefore: 0.03, returnAfter: 0.03 }));
    expect(r.projectedAtRetire).toBeCloseTo(120000, 4);
    expect(r.requiredAtRetire).toBeCloseTo(120000, 4);
  });

  it('example 5: income from the end age never pays inside the horizon', () => {
    const r = calculateRetirement(ret({ currentAge: 60, retireAge: 60, endAge: 62, assets: 0, monthlyContribution: 0, monthlyIncome: 4000, incomeStartAge: 62 }));
    expect(r.requiredAtRetire).toBeCloseTo(240000, 4);
  });
});

describe('retirement numeric properties', () => {
  it('requirement matches the closed-form present value at a negative real return', () => {
    // A=R=60, H=70, a=3%, p=5% -> real q per month; need = E * sum_{k=1..120} q^-k.
    const r = calculateRetirement(
      ret({ currentAge: 60, retireAge: 60, endAge: 70, assets: 0, monthlyContribution: 0, inflation: 0.05, returnAfter: 0.03, returnBefore: 0.03 }),
    );
    const q = Math.pow(1.03 / 1.05, 1 / 12);
    let expected = 0;
    for (let k = 1; k <= 120; k += 1) expected += 10000 / Math.pow(q, k);
    expect(Math.abs(r.requiredAtRetire! - expected)).toBeLessThanOrEqual(0.01);
    expect(r.requiredAtRetire!).toBeGreaterThan(1_200_000);
  });

  it('funding exactly the requirement ends at zero, one dollar less falls short', () => {
    const input = ret({ currentAge: 60, retireAge: 60, endAge: 70, assets: 0, monthlyContribution: 0, inflation: 0.02, returnAfter: 0.04 });
    const need = calculateRetirement(input).requiredAtRetire!;
    const ok = calculateRetirement({ ...input, assets: need });
    expect(ok.feasible).toBe(true);
    expect(Math.abs(ok.points.at(-1)!.realBalance)).toBeLessThanOrEqual(0.01);
    expect(calculateRetirement({ ...input, assets: need - 1 }).feasible).toBe(false);
  });

  it('higher spending never lowers the required capital', () => {
    let previous = -1;
    for (const spending of [0, 5000, 10000, 20000, 40000]) {
      const need = calculateRetirement(ret({ monthlySpending: spending, inflation: 0.02, returnAfter: 0.04 })).requiredToday!;
      expect(need).toBeGreaterThanOrEqual(previous);
      previous = need;
    }
  });

  it('income above spending needs no capital', () => {
    const r = calculateRetirement(ret({ currentAge: 60, retireAge: 60, endAge: 65, assets: 0, monthlyContribution: 0, monthlyIncome: 30000, incomeStartAge: 60 }));
    expect(r.requiredAtRetire).toBe(0);
    expect(r.feasible).toBe(true);
    expect(r.earliestRetireAge).toBe(60);
  });

  it('retiring today needs more than retiring later with accumulation', () => {
    const r = calculateRetirement(ret({ currentAge: 40, retireAge: 65, endAge: 90, assets: 1_000_000, monthlyContribution: 20000, monthlySpending: 50000, inflation: 0.02, returnBefore: 0.05, returnAfter: 0.04 }));
    expect(r.requiredToday!).toBeGreaterThan(r.requiredAtRetire!);
  });

  it('reports no earliest age when nothing in the horizon works', () => {
    const r = calculateRetirement(ret({ currentAge: 40, retireAge: 65, endAge: 90, assets: 0, monthlyContribution: 0, monthlySpending: 100000 }));
    expect(r.earliestRetireAge).toBeNull();
    expect(r.feasible).toBe(false);
    expect(r.firstShortfallAge).toBe(65);
    expect(r.gap!).toBeGreaterThan(0);
  });

  it('max affordable spending is consistent with the model', () => {
    const input = ret({ currentAge: 50, retireAge: 60, endAge: 85, assets: 3_000_000, monthlyContribution: 30000, inflation: 0.02, returnBefore: 0.05, returnAfter: 0.03 });
    const r = calculateRetirement(input);
    const atMax = calculateRetirement({ ...input, monthlySpending: r.maxMonthlySpending! });
    expect(atMax.feasible).toBe(true);
    const slightlyMore = calculateRetirement({ ...input, monthlySpending: r.maxMonthlySpending! + 1 });
    expect(slightlyMore.feasible).toBe(false);
  });

  it('flags a cap instead of claiming an exact maximum', () => {
    const r = calculateRetirement(ret({ currentAge: 59, retireAge: 60, endAge: 61, assets: 1_000_000_000, monthlyContribution: 1_000_000_000 }));
    expect(r.maxSpendingExceedsCap).toBe(true);
  });

  it('zero real return and nominal chart conversion', () => {
    const r = calculateRetirement(ret({ inflation: 0.03, returnBefore: 0.03, returnAfter: 0.03 }));
    const last = r.points.at(-1)!;
    expect(last.nominalBalance).toBeCloseTo(last.realBalance * Math.pow(1.03, last.month / 12), 8);
    expect(r.points[0].nominalBalance).toBe(60000);
  });

  it('earliest age depends on a fixed income start age', () => {
    const input = ret({ currentAge: 55, retireAge: 65, endAge: 70, assets: 120000, monthlyContribution: 0, monthlySpending: 10000, monthlyIncome: 10000, incomeStartAge: 65 });
    const r = calculateRetirement(input);
    // Retiring at 64 needs one year of spending (120,000) which W covers; income from 65 pays the rest.
    // Retiring at 63 would need 240,000 because income has not started.
    expect(r.earliestRetireAge).toBe(64);
  });
});

describe('retirement validation', () => {
  it('rejects bad ages', () => {
    expect(calculateRetirement(ret({ currentAge: 17 })).errors.currentAge).toBeDefined();
    expect(calculateRetirement(ret({ retireAge: 58 })).errors.retireAge).toBeDefined();
    expect(calculateRetirement(ret({ endAge: 60 })).errors.endAge).toBeDefined();
    expect(calculateRetirement(ret({ endAge: 121 })).errors.endAge).toBeDefined();
    expect(calculateRetirement(ret({ currentAge: 59.5 })).errors.currentAge).toBeDefined();
  });
  it('rejects bad money and rates', () => {
    expect(calculateRetirement(ret({ assets: -1 })).status).toBe('invalid');
    expect(calculateRetirement(ret({ monthlySpending: Number.NaN })).status).toBe('invalid');
    expect(calculateRetirement(ret({ inflation: 0.21 })).errors.inflation).toBeDefined();
    expect(calculateRetirement(ret({ returnBefore: -0.995 })).errors.returnBefore).toBeDefined();
    expect(calculateRetirement(ret({ returnAfter: 1.01 })).errors.returnAfter).toBeDefined();
  });
  it('requires an income start age when income is given, and bounds it', () => {
    expect(calculateRetirement(ret({ monthlyIncome: 100 })).errors.incomeStartAge).toBeDefined();
    expect(calculateRetirement(ret({ monthlyIncome: 100, incomeStartAge: 58 })).errors.incomeStartAge).toBeDefined();
    expect(calculateRetirement(ret({ monthlyIncome: 100, incomeStartAge: 62 })).errors.incomeStartAge).toBeDefined();
  });
});
