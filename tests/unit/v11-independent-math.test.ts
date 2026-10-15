import { describe, expect, it } from 'vitest';
import { calculateMortgage } from '../../src/lib/calculators/mortgage';
import { calculatePersonalLoan } from '../../src/lib/calculators/loan';
import { calculatePledge } from '../../src/lib/calculators/pledge';
import { calculateRetirement } from '../../src/lib/calculators/retirement';
import { calculateAllocation, calculateAccumulation } from '../../src/lib/calculators/portfolio';

describe('V11-04 房貸獨立推導驗證', () => {
  it('P=120,000, 12期, 0%, 費用0: 月付10,000, 總利息0, 期末0', () => {
    const res = calculateMortgage({
      mode: 'principal',
      principal: 120000,
      termMonths: 12,
      segments: [{ startMonth: 1, annualRate: 0 }],
      method: 'annuity',
      graceMonths: 0,
      fee: 0,
    });
    expect(res.status).toBe('valid');
    const s = res.schedule!.summary!;
    expect(s.firstPayment).toBe(10000);
    expect(s.totalInterest).toBe(0);
    expect(s.totalCost).toBe(120000);
    expect(s.totalPrincipal).toBe(120000);
    const rows = res.schedule!.rows;
    expect(rows).toHaveLength(12);
    expect(rows[11].balance).toBe(0);
    const sumPrincipal = rows.reduce((acc, r) => acc + r.principal, 0);
    expect(Math.abs(sumPrincipal - 120000)).toBeLessThanOrEqual(0.01);
  });

  it('3期寬限: 前3期0, 後9期約13,333.333333, 本金總和120,000', () => {
    const res = calculateMortgage({
      mode: 'principal',
      principal: 120000,
      termMonths: 12,
      segments: [{ startMonth: 1, annualRate: 0 }],
      method: 'annuity',
      graceMonths: 3,
      fee: 0,
    });
    const s = res.schedule!.summary!;
    expect(s.gracePayment).toBe(0);
    expect(s.postGraceFirstPayment).toBeCloseTo(13333.333333, 4);
    const rows = res.schedule!.rows;
    expect(rows[0].payment).toBe(0);
    expect(rows[1].payment).toBe(0);
    expect(rows[2].payment).toBe(0);
    for (let i = 3; i < 12; i++) {
      expect(rows[i].payment).toBeCloseTo(13333.333333, 1);
    }
    const sumPrincipal = rows.reduce((acc, r) => acc + r.principal, 0);
    expect(Math.abs(sumPrincipal - 120000)).toBeLessThanOrEqual(0.01);
  });
});

describe('V11-05 信貸獨立推導驗證', () => {
  it('P=100,000, 12期, 6%, 費用0: 月付8,606.642970708, 總利息3,279.715648499, 年化=(1.005)^12 - 1', () => {
    const res = calculatePersonalLoan({
      principal: 100000,
      termMonths: 12,
      annualRate: 0.06,
      fee: 0,
      feeMode: 'deducted',
    });
    expect(res.status).toBe('valid');
    expect(res.monthlyPayment).toBeCloseTo(8606.642970708, 4);
    expect(res.totalInterest).toBeCloseTo(3279.715648499, 4);
    const expectedAnnual = Math.pow(1.005, 12) - 1;
    expect(res.effectiveAnnualCost).toBeCloseTo(expectedAnnual, 6);
  });

  it('費用增加須降低淨撥款並提高年化成本', () => {
    const base = calculatePersonalLoan({ principal: 100000, termMonths: 12, annualRate: 0.06, fee: 0, feeMode: 'deducted' });
    const withFee = calculatePersonalLoan({ principal: 100000, termMonths: 12, annualRate: 0.06, fee: 3000, feeMode: 'deducted' });
    expect(withFee.netProceeds).toBe(97000);
    expect(withFee.effectiveAnnualCost!).toBeGreaterThan(base.effectiveAnnualCost!);
  });
});

describe('V11-06 股票質押獨立推導驗證', () => {
  it('V=1,000,000, L=600,000, 警示130%, 目標166%: 門檻市值780,000, 跌幅22%; 下跌30%市值700,000, 還款約178,313.253012或追加296,000', () => {
    const res = calculatePledge({
      collateralValue: 1000000,
      loanToValue: 0.6,
      loanAmount: 600000,
      annualRate: 0.03,
      days: 365,
      warningRatio: 1.3,
      targetRatio: 1.66,
      customShock: -0.4,
    });
    expect(res.thresholdCollateral).toBe(780000);
    expect(res.dropToThreshold).toBeCloseTo(0.22, 6);

    const s30 = res.scenarios.find((s) => s.shock === -0.3)!;
    expect(s30.collateral).toBe(700000);
    expect(s30.cashRepaymentToTarget).toBeCloseTo(178313.253012, 4);
    expect(s30.additionalCollateralToTarget).toBe(296000);

    // 兩解法分別重算回復 166%
    // 還款後維持率: 700000 / (600000 - 178313.253012)
    const newL = 600000 - s30.cashRepaymentToTarget;
    expect(700000 / newL).toBeCloseTo(1.66, 4);

    // 追加後維持率: (700000 + 296000) / 600000
    const newV = 700000 + s30.additionalCollateralToTarget;
    expect(newV / 600000).toBeCloseTo(1.66, 4);
  });

  it('L=0 呈現不適用，不除以零', () => {
    const res = calculatePledge({
      collateralValue: 1000000,
      loanToValue: 0.6,
      loanAmount: 0,
      annualRate: 0.03,
      days: 365,
      warningRatio: 1.3,
      targetRatio: 1.66,
      customShock: -0.4,
    });
    expect(res.status).toBe('no-debt');
    expect(res.maintenance).toBeNull();
    expect(res.dropToThreshold).toBeNull();
    expect(res.yearInterest).toBe(0);
  });
});

describe('V11-07 退休獨立推導驗證', () => {
  it('A=59, R=60, H=61, W=60,000, C=5,000, E=10,000, 利率與通膨0: 今天本金240,000, 目標本金120,000, 預估120,000, 應存5,000, 最早60歲', () => {
    const res = calculateRetirement({
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
    });
    expect(res.status).toBe('valid');
    expect(res.feasible).toBe(true);
    expect(res.requiredToday).toBe(240000); // 24 個月 * 10,000
    expect(res.requiredAtRetire).toBe(120000); // 12 個月 * 10,000
    expect(res.projectedAtRetire).toBe(120000); // 60,000 + 12 * 5,000
    expect(res.neededSaving).toBe(5000);
    expect(res.earliestRetireAge).toBe(60);
  });
});

describe('V11-09 投資組合獨立推導驗證', () => {
  it('配置: 60,000跌20%, 40,000跌10%, 負債30,000: 壓力資產84,000, 淨值54,000', () => {
    const res = calculateAllocation({
      assets: [
        { name: '資產1', category: '股票', value: 60000, shock: -0.2 },
        { name: '資產2', category: '債券', value: 40000, shock: -0.1 },
      ],
      loans: [{ name: '負債1', principal: 30000, annualRate: 0.03 }],
    });
    expect(res.gross).toBe(100000);
    expect(res.debt).toBe(30000);
    expect(res.equity).toBe(70000);
    expect(res.stressGross).toBe(84000); // 60000*0.8 + 40000*0.9 = 48000 + 36000 = 84000
    expect(res.stressEquity).toBe(54000); // 84000 - 30000 = 54000
    expect(res.equityChange).toBe(-16000);
  });

  it('累積模式權重總和 60%+30%=90% 須拒絕', () => {
    const res = calculateAccumulation({
      initial: 100000,
      monthlyContribution: 10000,
      years: 10,
      assets: [
        { name: '資產1', weight: 0.6, annualReturn: 0.06 },
        { name: '資產2', weight: 0.3, annualReturn: 0.03 },
      ],
    });
    expect(res.status).toBe('invalid');
    expect(res.errors.weightSum).toBeDefined();
  });
});
