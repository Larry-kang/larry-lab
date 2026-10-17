import { describe, expect, it } from 'vitest';
import { calculatePersonalLoan, solveMonthlyIrr, type PersonalLoanInput } from '../../src/lib/calculators/loan';

const loan = (overrides: Partial<PersonalLoanInput> = {}): PersonalLoanInput => ({
  principal: 100000,
  annualRate: 0.06,
  termMonths: 12,
  fee: 0,
  feeMode: 'deducted',
  ...overrides,
});

/** Independent PV of level payments, closed form. */
function levelAnnuityPv(payment: number, x: number, n: number): number {
  return (payment * (1 - Math.pow(1 + x, -n))) / x;
}

describe('personal loan contract examples', () => {
  it('P=100,000 N=12 r=6% F=0', () => {
    const r = calculatePersonalLoan(loan());
    expect(r.status).toBe('valid');
    expect(r.monthlyPayment).toBeCloseTo(8606.642970708, 6);
    expect(r.totalInterest).toBeCloseTo(3279.715648499, 6);
    expect(r.effectiveAnnualCost).toBeCloseTo(Math.pow(1.005, 12) - 1, 9);
    expect(r.monthlyIrr).toBeCloseTo(0.005, 9);
  });

  it('P=12,000 N=12 r=0% F=1,000', () => {
    const r = calculatePersonalLoan(loan({ principal: 12000, annualRate: 0, fee: 1000 }));
    expect(r.netProceeds).toBe(11000);
    expect(r.monthlyPayment).toBeCloseTo(1000, 8);
    const sum = r.schedule!.rows.reduce((s, row) => s + row.payment, 0);
    expect(sum).toBeCloseTo(12000, 6);
    expect(r.totalCost).toBeCloseTo(13000, 6);
    expect(r.monthlyIrr!).toBeGreaterThan(0);
    // Independent bracket: PV at 1%/month is 11,255 (> 11,000) and at 2% is 10,575 (< 11,000).
    expect(levelAnnuityPv(1000, 0.01, 12)).toBeGreaterThan(11000);
    expect(levelAnnuityPv(1000, 0.02, 12)).toBeLessThan(11000);
    expect(r.monthlyIrr!).toBeGreaterThan(0.01);
    expect(r.monthlyIrr!).toBeLessThan(0.02);
    // Independent residual using the closed form.
    expect(Math.abs(levelAnnuityPv(1000, r.monthlyIrr!, 12) - 11000)).toBeLessThanOrEqual(0.01);
  });

  it('F=0, r=0 gives exactly zero cost', () => {
    const r = calculatePersonalLoan(loan({ annualRate: 0 }));
    expect(r.monthlyIrr).toBe(0);
    expect(r.effectiveAnnualCost).toBe(0);
  });

  it('annualises with compounding, not 12x', () => {
    const r = calculatePersonalLoan(loan({ principal: 12000, annualRate: 0, fee: 1000 }));
    expect(r.effectiveAnnualCost!).toBeCloseTo(Math.pow(1 + r.monthlyIrr!, 12) - 1, 10);
    expect(r.effectiveAnnualCost!).toBeGreaterThan(12 * r.monthlyIrr!);
  });

  it('a larger fee raises the estimated cost; fee mode does not change numbers', () => {
    const small = calculatePersonalLoan(loan({ fee: 1000 }));
    const large = calculatePersonalLoan(loan({ fee: 3000 }));
    const separate = calculatePersonalLoan(loan({ fee: 3000, feeMode: 'separate' }));
    expect(large.effectiveAnnualCost!).toBeGreaterThan(small.effectiveAnnualCost!);
    expect(separate.effectiveAnnualCost).toBe(large.effectiveAnnualCost);
    expect(large.netProceeds).toBe(97000);
  });

  it('matches an independent discounted-cash-flow solver with fees at 120 months', () => {
    const r = calculatePersonalLoan(loan({ principal: 500000, annualRate: 0.0388, termMonths: 84, fee: 8000 }));
    const payment = r.monthlyPayment!;
    // Independent Newton-free bisection on the closed-form PV.
    let lo = 1e-9;
    let hi = 0.5;
    for (let i = 0; i < 200; i += 1) {
      const mid = (lo + hi) / 2;
      if (levelAnnuityPv(payment, mid, 84) > 492000) lo = mid;
      else hi = mid;
    }
    expect(r.monthlyIrr!).toBeCloseTo((lo + hi) / 2, 8);
  });
});

describe('personal loan validation', () => {
  it('rejects fee >= principal', () => {
    expect(calculatePersonalLoan(loan({ fee: 100000 })).errors.fee).toBeDefined();
    expect(calculatePersonalLoan(loan({ fee: 120000 })).status).toBe('invalid');
  });
  it('rejects negative fee, bad term, non-positive principal and bad rate', () => {
    expect(calculatePersonalLoan(loan({ fee: -1 })).status).toBe('invalid');
    expect(calculatePersonalLoan(loan({ termMonths: 121 })).errors.termMonths).toBeDefined();
    expect(calculatePersonalLoan(loan({ principal: 0 })).errors.principal).toBeDefined();
    expect(calculatePersonalLoan(loan({ annualRate: 1.01 })).errors.annualRate).toBeDefined();
    expect(calculatePersonalLoan(loan({ annualRate: Number.NaN })).status).toBe('invalid');
  });
});

describe('solveMonthlyIrr', () => {
  it('returns null when no non-negative root exists', () => {
    expect(solveMonthlyIrr(2000, [500, 500])).toBeNull();
  });
});
