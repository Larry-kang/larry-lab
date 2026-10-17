import { describe, expect, it } from 'vitest';
import {
  calculateAccumulation,
  calculateAllocation,
  type AccumulationInput,
  type AllocationInput,
} from '../../src/lib/calculators/portfolio';

const alloc = (overrides: Partial<AllocationInput> = {}): AllocationInput => ({
  assets: [
    { name: 'A', category: '股票', value: 60000, shock: -0.2 },
    { name: 'B', category: '債券', value: 40000, shock: -0.1 },
  ],
  loans: [{ name: '借款', principal: 30000, annualRate: 0.04 }],
  ...overrides,
});

describe('portfolio allocation / stress (contract example)', () => {
  it('computes the documented metrics', () => {
    const r = calculateAllocation(alloc());
    expect(r.status).toBe('valid');
    expect(r.gross).toBe(100000);
    expect(r.debt).toBe(30000);
    expect(r.equity).toBe(70000);
    expect(r.rows[0].weight).toBeCloseTo(0.6, 10);
    expect(r.rows[1].weight).toBeCloseTo(0.4, 10);
    expect(r.debtRatio).toBeCloseTo(0.3, 10);
    expect(r.leverage).toBeCloseTo(1.4285714, 6);
    expect(r.annualInterest).toBeCloseTo(1200, 8);
    expect(r.monthlyInterest).toBeCloseTo(100, 8);
    expect(r.stressGross).toBeCloseTo(84000, 6);
    expect(r.stressEquity).toBeCloseTo(54000, 6);
    expect(r.equityChange).toBeCloseTo(-16000, 6);
    expect(r.equityReturn! * 100).toBeCloseTo(-22.8571429, 6);
  });

  it('works with no loans', () => {
    const r = calculateAllocation(alloc({ loans: [] }));
    expect(r.debt).toBe(0);
    expect(r.leverage).toBeCloseTo(1, 10);
    expect(r.annualInterest).toBe(0);
  });

  it('non-positive equity makes leverage and equity return N/A without dividing by zero', () => {
    const zero = calculateAllocation(alloc({ loans: [{ name: 'x', principal: 100000, annualRate: 0.02 }] }));
    expect(zero.status).toBe('no-equity');
    expect(zero.leverage).toBeNull();
    expect(zero.equityReturn).toBeNull();
    const negative = calculateAllocation(alloc({ loans: [{ name: 'x', principal: 150000, annualRate: 0.02 }] }));
    expect(negative.equity).toBe(-50000);
    expect(negative.leverage).toBeNull();
    expect(negative.equityReturn).toBeNull();
    expect(Number.isFinite(negative.debtRatio!)).toBe(true);
  });

  it('keeps losses beyond -100% of equity when equity is positive', () => {
    const r = calculateAllocation({
      assets: [{ name: 'A', category: '股票', value: 100000, shock: -1 }],
      loans: [{ name: 'L', principal: 50000, annualRate: 0 }],
    });
    expect(r.stressEquity).toBe(-50000);
    expect(r.equityReturn! * 100).toBeCloseTo(-200, 8);
    expect(r.stressEquityNegative).toBe(true);
  });

  it('zero total assets makes weights and debt ratio N/A', () => {
    const r = calculateAllocation({ assets: [{ name: 'A', category: '現金', value: 0, shock: 0 }], loans: [] });
    expect(r.rows[0].weight).toBeNull();
    expect(r.debtRatio).toBeNull();
  });

  it('enforces counts and ranges', () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ name: `a${i}`, category: 'x', value: 1, shock: 0 }));
    expect(calculateAllocation(alloc({ assets: many })).errors.assets).toBeDefined();
    expect(calculateAllocation(alloc({ assets: [] })).errors.assets).toBeDefined();
    const loans = Array.from({ length: 11 }, () => ({ name: 'l', principal: 1, annualRate: 0 }));
    expect(calculateAllocation(alloc({ loans })).errors.loans).toBeDefined();
    expect(calculateAllocation(alloc({ assets: [{ name: 'A', category: 'x', value: -1, shock: 0 }] })).status).toBe('invalid');
    expect(calculateAllocation(alloc({ assets: [{ name: 'A', category: 'x', value: 1, shock: -1.01 }] })).status).toBe('invalid');
    expect(calculateAllocation(alloc({ loans: [{ name: 'l', principal: 1, annualRate: -0.01 }] })).status).toBe('invalid');
    expect(calculateAllocation(alloc({ assets: [{ name: 'A', category: 'x', value: Number.NaN, shock: 0 }] })).status).toBe('invalid');
  });
});

const acc = (overrides: Partial<AccumulationInput> = {}): AccumulationInput => ({
  initial: 120000,
  monthlyContribution: 1000,
  years: 1,
  assets: [
    { name: 'A', weight: 0.5, annualReturn: 0 },
    { name: 'B', weight: 0.5, annualReturn: 0 },
  ],
  ...overrides,
});

describe('portfolio accumulation', () => {
  it('contract example: zero returns', () => {
    const r = calculateAccumulation(acc());
    expect(r.finalValue).toBeCloseTo(132000, 6);
    expect(r.finalByAsset[0]).toBeCloseTo(66000, 6);
    expect(r.finalByAsset[1]).toBeCloseTo(66000, 6);
    expect(r.gain).toBeCloseTo(0, 6);
    expect(r.totalContributed).toBe(132000);
  });

  it('contract example: 12% single asset without contributions', () => {
    const r = calculateAccumulation(acc({ initial: 100000, monthlyContribution: 0, assets: [{ name: 'A', weight: 1, annualReturn: 0.12 }] }));
    expect(r.finalValue).toBeCloseTo(112000, 6);
  });

  it('rebalances yearly (independent hand calculation)', () => {
    // 10%/0% 50:50, W=100,000, no contributions: y1 = 55,000+50,000 = 105,000 -> 52,500 each;
    // y2 = 57,750 + 52,500 = 110,250.
    const r = calculateAccumulation(
      acc({ initial: 100000, monthlyContribution: 0, years: 2, assets: [{ name: 'A', weight: 0.5, annualReturn: 0.1 }, { name: 'B', weight: 0.5, annualReturn: 0 }] }),
    );
    expect(r.yearRows[1].value).toBeCloseTo(105000, 6);
    expect(r.yearRows[2].value).toBeCloseTo(110250, 6);
  });

  it('matches an independent monthly loop with contributions and 3 assets over 5 years', () => {
    const weights = [0.6, 0.3, 0.1];
    const returns = [0.07, 0.03, -0.05];
    const W = 500000;
    const C = 15000;
    // Independent: track one total and per-asset arrays separately with plain for-loops.
    let a = weights.map((w) => W * w);
    for (let m = 1; m <= 60; m += 1) {
      for (let j = 0; j < 3; j += 1) {
        a[j] = a[j] * Math.pow(1 + returns[j], 1 / 12) + C * weights[j];
      }
      if (m % 12 === 0) {
        const t = a[0] + a[1] + a[2];
        a = weights.map((w) => t * w);
      }
    }
    const expected = a[0] + a[1] + a[2];
    const r = calculateAccumulation(
      acc({ initial: W, monthlyContribution: C, years: 5, assets: weights.map((w, j) => ({ name: `A${j}`, weight: w, annualReturn: returns[j] })) }),
    );
    expect(Math.abs(r.finalValue! - expected)).toBeLessThanOrEqual(0.01);
    expect(r.totalContributed).toBe(W + 60 * C);
    expect(r.yearRows).toHaveLength(6);
    expect(r.gain).toBeCloseTo(r.finalValue! - r.totalContributed!, 8);
    // Rebalancing preserves the total: final per-asset values equal total * weight.
    r.finalByAsset.forEach((v, j) => expect(v).toBeCloseTo(r.finalValue! * weights[j], 6));
  });

  it('a zero-weight asset creates no balance', () => {
    const r = calculateAccumulation(acc({ assets: [{ name: 'A', weight: 1, annualReturn: 0 }, { name: 'B', weight: 0, annualReturn: 0.5 }] }));
    expect(r.finalByAsset[1]).toBe(0);
    expect(r.finalValue).toBeCloseTo(132000, 6);
  });

  it('requires weights to sum to 100% within 1e-6', () => {
    expect(calculateAccumulation(acc({ assets: [{ name: 'A', weight: 0.5, annualReturn: 0 }, { name: 'B', weight: 0.49999, annualReturn: 0 }] })).errors.weightSum).toBeDefined();
    const ok = calculateAccumulation(acc({ assets: [{ name: 'A', weight: 1 / 3, annualReturn: 0 }, { name: 'B', weight: 1 / 3, annualReturn: 0 }, { name: 'C', weight: 1 / 3, annualReturn: 0 }] }));
    expect(ok.status).toBe('valid');
  });

  it('validates years, returns and asset counts', () => {
    expect(calculateAccumulation(acc({ years: 0 })).errors.years).toBeDefined();
    expect(calculateAccumulation(acc({ years: 61 })).errors.years).toBeDefined();
    expect(calculateAccumulation(acc({ years: 2.5 })).errors.years).toBeDefined();
    expect(calculateAccumulation(acc({ assets: [{ name: 'A', weight: 1, annualReturn: -1 }] })).status).toBe('invalid');
    expect(calculateAccumulation(acc({ assets: [] })).errors.assets).toBeDefined();
    expect(calculateAccumulation(acc({ initial: -1 })).status).toBe('invalid');
  });
});
