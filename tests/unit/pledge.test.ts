import { describe, expect, it } from 'vitest';
import { calculatePledge, type PledgeInput } from '../../src/lib/calculators/pledge';

const pledge = (overrides: Partial<PledgeInput> = {}): PledgeInput => ({
  collateralValue: 1_000_000,
  loanToValue: 0.6,
  loanAmount: 600_000,
  annualRate: 0.03,
  days: 365,
  warningRatio: 1.3,
  targetRatio: 1.66,
  customShock: -0.4,
  ...overrides,
});

describe('stock pledge contract example', () => {
  const r = calculatePledge(pledge());

  it('base metrics', () => {
    expect(r.status).toBe('valid');
    expect(r.illustratedLimit).toBeCloseTo(600_000, 6);
    expect(r.maintenance! * 100).toBeCloseTo(166.6666667, 6);
    expect(r.yearInterest).toBeCloseTo(18_000, 6);
    expect(r.averageMonthlyInterest).toBeCloseTo(1_500, 6);
    expect(r.termInterest).toBeCloseTo(18_000, 6);
    expect(r.equity).toBe(400_000);
    expect(r.overIllustratedLimit).toBe(false);
  });

  it('threshold collateral and drop', () => {
    expect(r.thresholdCollateral).toBeCloseTo(780_000, 6);
    expect(r.dropToThreshold! * 100).toBeCloseTo(22, 6);
    expect(r.atOrBelowThreshold).toBe(false);
  });

  it('-30% scenario and the two different recovery paths', () => {
    const s = r.scenarios.find((x) => x.shock === -0.3)!;
    expect(s.collateral).toBeCloseTo(700_000, 6);
    expect(s.maintenance! * 100).toBeCloseTo(116.6666667, 6);
    expect(s.equity).toBeCloseTo(100_000, 6);
    expect(s.belowWarning).toBe(true);
    expect(s.cashRepaymentToTarget).toBeCloseTo(600_000 - 700_000 / 1.66, 6);
    expect(s.cashRepaymentToTarget).toBeCloseTo(178_313.253012, 5);
    expect(s.additionalCollateralToTarget).toBeCloseTo(296_000, 6);
    // Each remedy alone restores 166%; they are alternatives and must not be added.
    expect(700_000 / (600_000 - s.cashRepaymentToTarget)).toBeCloseTo(1.66, 9);
    expect((700_000 + s.additionalCollateralToTarget) / 600_000).toBeCloseTo(1.66, 9);
  });

  it('-100% scenario requires full repayment or 996,000 additional collateral', () => {
    const s = calculatePledge(pledge({ customShock: -1 })).scenarios.at(-1)!;
    expect(s.collateral).toBe(0);
    expect(s.maintenance).toBe(0);
    expect(s.cashRepaymentToTarget).toBeCloseTo(600_000, 6);
    expect(s.additionalCollateralToTarget).toBeCloseTo(996_000, 6);
  });

  it('includes the four presets plus the custom scenario', () => {
    expect(r.scenarios.map((s) => s.shock)).toEqual([-0.1, -0.2, -0.3, -0.5, -0.4]);
  });
});

describe('stock pledge edge cases', () => {
  it('zero loan means no debt, N/A maintenance and zero interest', () => {
    const r = calculatePledge(pledge({ loanAmount: 0 }));
    expect(r.status).toBe('no-debt');
    expect(r.maintenance).toBeNull();
    expect(r.dropToThreshold).toBeNull();
    expect(r.termInterest).toBe(0);
    r.scenarios.forEach((s) => {
      expect(s.maintenance).toBeNull();
      expect(s.belowWarning).toBe(false);
      expect(s.cashRepaymentToTarget).toBe(0);
    });
  });

  it('zero collateral with debt is undercollateralised with ratio 0', () => {
    const r = calculatePledge(pledge({ collateralValue: 0 }));
    expect(r.maintenance).toBe(0);
    expect(r.atOrBelowThreshold).toBe(true);
    expect(r.dropToThreshold).toBeNull();
  });

  it('at exactly the threshold the status is "reached", not a positive drop', () => {
    const r = calculatePledge(pledge({ collateralValue: 780_000 }));
    expect(r.atOrBelowThreshold).toBe(true);
    expect(r.dropToThreshold).toBeNull();
  });

  it('just above the threshold still has a small positive drop', () => {
    const r = calculatePledge(pledge({ collateralValue: 780_001 }));
    expect(r.atOrBelowThreshold).toBe(false);
    expect(r.dropToThreshold!).toBeGreaterThan(0);
    expect(r.dropToThreshold!).toBeLessThan(0.0001);
  });

  it('allows a loan above the illustrated limit and flags it', () => {
    const r = calculatePledge(pledge({ loanAmount: 700_000 }));
    expect(r.status).toBe('valid');
    expect(r.overIllustratedLimit).toBe(true);
  });

  it('shows nothing needed when already above the target', () => {
    const r = calculatePledge(pledge({ collateralValue: 2_000_000, customShock: 0.1 }));
    r.scenarios.forEach((s) => {
      expect(s.cashRepaymentToTarget).toBe(0);
      expect(s.additionalCollateralToTarget).toBe(0);
    });
  });

  it('rejects invalid inputs', () => {
    expect(calculatePledge(pledge({ targetRatio: 1.2 })).errors.targetRatio).toBeDefined();
    expect(calculatePledge(pledge({ loanToValue: 1.2 })).errors.loanToValue).toBeDefined();
    expect(calculatePledge(pledge({ days: 0 })).errors.days).toBeDefined();
    expect(calculatePledge(pledge({ days: 3651 })).errors.days).toBeDefined();
    expect(calculatePledge(pledge({ warningRatio: 10.5 })).errors.warningRatio).toBeDefined();
    expect(calculatePledge(pledge({ warningRatio: 0 })).status).toBe('invalid');
    expect(calculatePledge(pledge({ loanAmount: -1 })).status).toBe('invalid');
    expect(calculatePledge(pledge({ collateralValue: Number.NaN })).status).toBe('invalid');
    expect(calculatePledge(pledge({ customShock: -1.5 })).errors.customShock).toBeDefined();
  });
});
