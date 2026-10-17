import { describe, expect, it } from 'vitest';
import { buildSchedule, finalBalanceResidual, type ScheduleInput } from '../../src/lib/calculators/amortization';
import { calculateMortgage, type MortgageInput } from '../../src/lib/calculators/mortgage';

const base = (overrides: Partial<ScheduleInput> = {}): ScheduleInput => ({
  principal: 120000,
  termMonths: 12,
  segments: [{ startMonth: 1, annualRate: 0 }],
  method: 'annuity',
  graceMonths: 0,
  fee: 0,
  maxTermMonths: 600,
  ...overrides,
});

/**
 * Independent reference: textbook pow-based loops, written separately from the production code.
 * `rates[m-1]` is the nominal annual rate of month m.
 */
function reference(P: number, N: number, rates: number[], grace: number, method: 'annuity' | 'equal-principal') {
  const payments: number[] = [];
  const interests: number[] = [];
  let bal = P;
  for (let m = 1; m <= N; m += 1) {
    const i = rates[m - 1] / 12;
    const interest = bal * i;
    let principalPart: number;
    if (m <= grace) principalPart = 0;
    else if (method === 'equal-principal') principalPart = P / (N - grace);
    else {
      const n = N - m + 1;
      const pay = i === 0 ? bal / n : (bal * i) / (1 - Math.pow(1 + i, -n));
      principalPart = pay - interest;
    }
    payments.push(principalPart + interest);
    interests.push(interest);
    bal -= principalPart;
  }
  return { payments, interests, endBalance: bal };
}

describe('amortization contract examples', () => {
  it('zero rate annuity pays P/N with no interest', () => {
    const r = buildSchedule(base());
    expect(r.status).toBe('valid');
    expect(r.rows).toHaveLength(12);
    r.rows.forEach((row) => expect(row.payment).toBeCloseTo(10000, 2));
    expect(r.summary?.totalInterest).toBeCloseTo(0, 6);
    expect(r.rows[11].balance).toBeCloseTo(0, 2);
  });

  it('zero rate equal-principal matches the annuity schedule', () => {
    const a = buildSchedule(base());
    const b = buildSchedule(base({ method: 'equal-principal' }));
    a.rows.forEach((row, i) => expect(b.rows[i].payment).toBeCloseTo(row.payment, 6));
  });

  it('12% equal-principal: first 11,200, last 10,100, interest 7,800', () => {
    const r = buildSchedule(
      base({ method: 'equal-principal', segments: [{ startMonth: 1, annualRate: 0.12 }] }),
    );
    expect(r.rows[0].payment).toBeCloseTo(11200, 2);
    expect(r.rows[11].payment).toBeCloseTo(10100, 2);
    expect(r.summary?.totalInterest).toBeCloseTo(7800, 2);
    expect(r.summary?.paymentIsConstant).toBe(false);
  });

  it('grace period of 3 months at 0%: 3 zero payments then 13,333.33', () => {
    const r = buildSchedule(base({ graceMonths: 3 }));
    expect(r.rows.slice(0, 3).map((x) => x.payment)).toEqual([0, 0, 0]);
    r.rows.slice(3).forEach((row) => expect(row.payment).toBeCloseTo(13333.333333, 5));
    const principalSum = r.rows.reduce((s, row) => s + row.principal, 0);
    expect(principalSum).toBeCloseTo(120000, 2);
    expect(r.summary?.gracePayment).toBe(0);
    expect(r.summary?.postGraceFirstPayment).toBeCloseTo(13333.333333, 5);
  });

  it('grace period charges interest only on the full principal', () => {
    const r = buildSchedule(base({ graceMonths: 2, segments: [{ startMonth: 1, annualRate: 0.06 }] }));
    expect(r.rows[0].payment).toBeCloseTo(600, 6);
    expect(r.rows[1].balance).toBeCloseTo(120000, 6);
    expect(r.rows[2].balance).toBeLessThan(120000);
  });

  it('adds the one-off fee to total cost but not to principal or interest', () => {
    const r = buildSchedule(base({ fee: 5000 }));
    expect(r.summary?.fee).toBe(5000);
    expect(r.summary?.totalCost).toBeCloseTo(125000, 2);
    expect(r.summary?.totalPrincipal).toBeCloseTo(120000, 2);
  });
});

describe('amortization against the independent reference', () => {
  const cases: Array<{ name: string; N: number; rates: number[]; grace: number; method: 'annuity' | 'equal-principal' }> = [
    { name: 'fixed 2.1% annuity 360m', N: 360, rates: Array(360).fill(0.021), grace: 0, method: 'annuity' },
    { name: 'fixed 2.1% equal principal 240m', N: 240, rates: Array(240).fill(0.021), grace: 0, method: 'equal-principal' },
    {
      name: 'step rates with grace',
      N: 120,
      rates: [...Array(24).fill(0.0175), ...Array(60).fill(0.0265), ...Array(36).fill(0)],
      grace: 12,
      method: 'annuity',
    },
    {
      name: 'step rates equal principal with grace',
      N: 60,
      rates: [...Array(30).fill(0.03), ...Array(30).fill(0.045)],
      grace: 6,
      method: 'equal-principal',
    },
  ];
  cases.forEach((c) => {
    it(c.name, () => {
      const segments = [{ startMonth: 1, annualRate: c.rates[0] }];
      for (let m = 2; m <= c.N; m += 1) {
        if (c.rates[m - 1] !== c.rates[m - 2]) segments.push({ startMonth: m, annualRate: c.rates[m - 1] });
      }
      const result = buildSchedule(
        base({ principal: 8_000_000, termMonths: c.N, segments, graceMonths: c.grace, method: c.method }),
      );
      const ref = reference(8_000_000, c.N, c.rates, c.grace, c.method);
      expect(result.rows).toHaveLength(c.N);
      result.rows.forEach((row, i) => {
        expect(Math.abs(row.payment - ref.payments[i])).toBeLessThanOrEqual(0.01);
        expect(Math.abs(row.interest - ref.interests[i])).toBeLessThanOrEqual(0.01);
        expect(row.balance).toBeGreaterThanOrEqual(-0.01);
      });
      expect(finalBalanceResidual(result.rows)).toBeLessThanOrEqual(0.01);
      expect(result.summary?.totalPrincipal).toBeCloseTo(8_000_000, 1);
    });
  });

  it('identical segments equal a fixed-rate schedule', () => {
    const fixed = buildSchedule(base({ segments: [{ startMonth: 1, annualRate: 0.03 }] }));
    const split = buildSchedule(
      base({
        segments: [
          { startMonth: 1, annualRate: 0.03 },
          { startMonth: 7, annualRate: 0.03 },
        ],
      }),
    );
    fixed.rows.forEach((row, i) => expect(split.rows[i].payment).toBeCloseTo(row.payment, 8));
  });

  it('a higher positive rate increases total interest', () => {
    const lo = buildSchedule(base({ segments: [{ startMonth: 1, annualRate: 0.02 }] }));
    const hi = buildSchedule(base({ segments: [{ startMonth: 1, annualRate: 0.03 }] }));
    expect(hi.summary!.totalInterest).toBeGreaterThan(lo.summary!.totalInterest);
  });

  it('stays stable for a vanishingly small rate', () => {
    const r = buildSchedule(base({ segments: [{ startMonth: 1, annualRate: 1e-14 }] }));
    expect(r.rows[0].payment).toBeCloseTo(10000, 4);
  });
});

describe('amortization validation', () => {
  it('rejects a grace period equal to the term', () => {
    expect(buildSchedule(base({ graceMonths: 12 })).errors.graceMonths).toBeDefined();
  });
  it('rejects invalid term, fee and principal', () => {
    expect(buildSchedule(base({ termMonths: 601 })).status).toBe('invalid');
    expect(buildSchedule(base({ termMonths: 0 })).status).toBe('invalid');
    expect(buildSchedule(base({ termMonths: 12.5 })).status).toBe('invalid');
    expect(buildSchedule(base({ fee: -1 })).errors.fee).toBeDefined();
    expect(buildSchedule(base({ principal: Number.NaN })).errors.principal).toBeDefined();
    expect(buildSchedule(base({ principal: Number.POSITIVE_INFINITY })).status).toBe('invalid');
    expect(buildSchedule(base({ principal: -5 })).status).toBe('invalid');
    expect(buildSchedule(base({ principal: 2_000_000_000 })).status).toBe('invalid');
  });
  it('rejects bad rate segments', () => {
    const seg = (startMonth: number, annualRate = 0.02) => ({ startMonth, annualRate });
    expect(buildSchedule(base({ segments: [seg(2)] })).errors['segments.0.startMonth']).toBeDefined();
    expect(buildSchedule(base({ segments: [seg(1), seg(1)] })).errors['segments.1.startMonth']).toBeDefined();
    expect(buildSchedule(base({ segments: [seg(1), seg(13)] })).errors['segments.1.startMonth']).toBeDefined();
    expect(buildSchedule(base({ segments: [seg(1), seg(6), seg(4)] })).errors['segments.2.startMonth']).toBeDefined();
    expect(buildSchedule(base({ segments: [seg(1, 1.5)] })).errors['segments.0.annualRate']).toBeDefined();
    expect(buildSchedule(base({ segments: [] })).errors.segments).toBeDefined();
  });
  it('treats a zero principal as no debt but keeps the fee', () => {
    const r = buildSchedule(base({ principal: 0, fee: 1000 }));
    expect(r.status).toBe('no-debt');
    expect(r.summary?.totalInterest).toBe(0);
    expect(r.summary?.totalCost).toBe(1000);
    expect(r.rows).toHaveLength(0);
  });
});

describe('mortgage inputs', () => {
  const mortgage = (overrides: Partial<MortgageInput> = {}): MortgageInput => ({
    mode: 'price-down',
    price: 10_000_000,
    downPayment: 2_000_000,
    termMonths: 360,
    segments: [{ startMonth: 1, annualRate: 0.021 }],
    method: 'annuity',
    graceMonths: 0,
    fee: 0,
    ...overrides,
  });

  it('derives principal from price minus down payment', () => {
    const r = calculateMortgage(mortgage());
    expect(r.derived?.principal).toBe(8_000_000);
    expect(r.status).toBe('valid');
  });
  it('derives principal from price and LTV', () => {
    const r = calculateMortgage(mortgage({ mode: 'price-ltv', ltv: 0.8, downPayment: undefined }));
    expect(r.derived?.principal).toBeCloseTo(8_000_000, 6);
    expect(r.derived?.downPayment).toBeCloseTo(2_000_000, 6);
  });
  it('rejects a down payment above the price and non-positive price', () => {
    expect(calculateMortgage(mortgage({ downPayment: 10_000_001 })).errors.downPayment).toBeDefined();
    expect(calculateMortgage(mortgage({ price: 0, downPayment: 0 })).errors.price).toBeDefined();
    expect(calculateMortgage(mortgage({ mode: 'price-ltv', ltv: 1.2 })).errors.ltv).toBeDefined();
  });
  it('reports no-debt when the down payment equals the price', () => {
    const r = calculateMortgage(mortgage({ downPayment: 10_000_000, fee: 3000 }));
    expect(r.status).toBe('no-debt');
    expect(r.schedule?.summary?.totalCost).toBe(3000);
  });
  it('computes burden ratio from max payment and other debt', () => {
    const r = calculateMortgage(
      mortgage({ mode: 'principal', principal: 120000, termMonths: 12, segments: [{ startMonth: 1, annualRate: 0 }], monthlyIncome: 50000, otherMonthlyDebt: 5000 }),
    );
    expect(r.burdenRatio).toBeCloseTo((10000 + 5000) / 50000, 10);
  });
  it('requires income greater than zero when provided', () => {
    expect(calculateMortgage(mortgage({ monthlyIncome: 0 })).errors.monthlyIncome).toBeDefined();
  });
  it('uses the highest payment (grace/interest) in the burden ratio', () => {
    const r = calculateMortgage(
      mortgage({ mode: 'principal', principal: 120000, termMonths: 12, graceMonths: 3, segments: [{ startMonth: 1, annualRate: 0 }], monthlyIncome: 40000 }),
    );
    expect(r.burdenRatio).toBeCloseTo(13333.333333 / 40000, 6);
  });
});
