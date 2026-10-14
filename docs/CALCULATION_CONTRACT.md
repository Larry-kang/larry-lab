# Numerical contract — Larry Lab v1

Version 1.0 · 2026-10-14. Required for any financial model or test change. Amounts are TWD; rates in formulas are decimals. These are explicit simplified product-model conventions, not actual lender settlement or personalized advice.

## 1. Shared numerical rules

Use full precision internally; rounding occurs at display/export boundaries. Summaries round to whole TWD, exported schedules to 0.01 TWD. A schedule's final payment clears its actual remaining balance; do not let rounded recurring payments leave material residuals. Internal principal reconciliation tolerance <=0.01 TWD, test fixture monetary tolerance <=0.01 TWD unless specified. Compare financial ratios before display rounding; test near thresholds.

Reject NaN, Infinity, blank required fields, unsupported signs, out-of-range numbers and invalid periods. Preserve a valid zero. Rates on loans are nominal annual 0–100%, monthly `i=r/12`. Investment nominal annual return -99%–100%, inflation 0–20%. A -100% one-time asset shock is allowed, but compounded annual returns must exceed -100%. Bound horizons and row counts as SPEC states; no unbounded loops.

Every result returns structured statuses (valid/invalid/infeasible/no-debt/no-equity as appropriate), units and assumptions. UI must not turn infeasible or undefined values into zero without a label.

## 2. Mortgage and personal-loan schedules

For principal `P`, monthly rate `i`, remaining months `n`, equal total payment:

```text
payment = P*i / (1 - (1+i)^(-n))    if i != 0
payment = P/n                       if i == 0
interest_m = balance_(m-1) * i_m
principal_m = payment_m - interest_m
balance_m = balance_(m-1) - principal_m
```

Use stable log/expm1 equivalents around zero if needed. Cap final principal at actual balance. Equal principal: after grace, principal per month is original unrepaid principal / remaining repayment months; monthly interest uses opening balance and therefore payments vary.

Loan payments are month-end, first one after one full month. No daily rate/day-count variation for these installment tools. Mortgage step rates use ordered start months (first must be month 1), each rate lasts until next segment; reject duplicates/out-of-term segments. At a rate change, recalculate equal-total payment on current balance and original remaining maturity, not a new full term. Equal-principal base remains based on post-grace principal and repayment months.

Grace `g` months pays interest only; `0 <= g < N`. Balance remains P during grace. Principal repaid in `N-g` months after grace, within total N. Rate changes during grace affect interest immediately. Fee F occurs at time zero and is not financed or compounded. Total interest = sum interest rows; principal sum = P; total cash outflow = sum loan payments + F. Property down payment is displayed separately and never classified as loan interest.

Derived mortgage inputs: `P=price-downPayment`, or `P=price*LTV`; LTV 0–100%. A positive price and nonnegative down payment <=price are necessary. P=0 produces a no-loan result with zero installment interest and no division; a user-entered fee remains separately visible. Monthly income >0 if entered; burden = (maximum loan monthly payment + other monthly debt payments)/income. Label this a budget ratio, not lender approval.

### Personal-loan estimated cash-flow cost

Gross principal P, fee `0 <= F < P`, actual net cash available `P-F`. Solve monthly IRR x from:

```text
P-F = sum(payment_m/(1+x)^m, m=1..N)
effectiveAnnualCost = (1+x)^12 - 1
```

All installment outflows positive and exactly one positive initial inflow; monthly root x>=0 is unique for supported nonnegative nominal rate/fee. Fee paid separately or withheld has the same time-zero net cost; do not count it twice in the IRR. Annualization is effective, not `12*x`. Use bracket expansion and bisection/robust root-finding; stop with monetary residual <=0.01 TWD and bounded iterations. If a root cannot be found, return a descriptive undefined cost, not 0%. `F=0,r=0` yields x=0 exactly. Official regulatory APR may use other conventions; label “估算有效年化成本（依本工具現金流）”.

### Loan fixtures and invariants

| Input | Expected |
| --- | --- |
| P=120,000, N=12, r=0%, F=0, equal total | payment=10,000; interest=0; ending balance=0 |
| Same, equal principal | identical schedule |
| P=120,000, N=12, r=12%, equal principal, no grace | first payment=11,200; last=10,100; total interest=7,800 |
| P=120,000, N=12, r=0%, grace=3 | first 3 payments=0; next 9=13,333.333333… before display rounding; principal sum=120,000 |
| Personal P=100,000, N=12, r=6%, F=0 | payment=8,606.642970708; interest=3,279.715648499; cost=(1.005)^12-1 |
| Personal P=12,000, N=12, r=0%, F=1,000 | net inflow=11,000; payment=1,000; payment sum=12,000; total cash outflow incl fee=13,000; positive IRR |

Additional tests: rate segments all equal reproduce fixed-rate model; 0% segments work; increasing positive rate increases cost under same terms; grace=N rejected; fee>=P rejected for personal loan; schedule rows count=N and balances never negative beyond tolerance. For IRR with a fee, independently verify discounted cash flows and compare a trusted independent numerical reference, not just the production helper.

## 3. Stock-pledge model

Aggregated eligible collateral market value V, illustrated loan fraction c, actual loan L, annual nominal rate r, days d, warning maintenance ratio t and restoration ratio u (e.g. UI 130% ->1.3). V,L>=0, c in [0,1], t>0, u>=t, both ratio inputs <=1000%. No debt capitalization, lender discount or existing extra collateral in this simplified v1 model.

```text
illustratedLimit = V*c
equity = V-L
maintenance = V/L                   for L>0
yearInterest = L*r
averageMonthlyInterest = L*r/12
termInterest = L*r*d/365             illustrative Actual/365 basis
scenarioCollateral = V*(1+shock)
scenarioMaintenance = scenarioCollateral/L
thresholdCollateral = L*t
dropToThreshold = 1-(L*t/V)          when V>0 and currently above threshold
cashRepaymentToTarget = max(0, L-scenarioCollateral/u)
additionalCollateralToTarget = max(0, L*u-scenarioCollateral)
```

At/below threshold show “已達／低於設定門檻”; don't display a negative remaining fall as future protection. If V=0,L>0, maintenance=0 and the loan is undercollateralized. If L=0, maintenance/drop threshold=N/A, costs=0 and no-debt state. Zero collateral with a positive existing loan is allowed as a stress state and shows full repayment need.

Cash repayment reduces debt; added eligible securities increase collateral. Pledged cash (if accepted by an actual lender) is additional collateral, not repayment. UI must not collapse the two equations or claim lender accepts any supplied asset.

### Pledge fixtures

V=1,000,000, L=600,000, c=60%, r=3%, d=365, t=130%, u=166%:

- limit=600,000; current maintenance=166.6666667%; annual interest=18,000; average monthly=1,500; term interest=18,000.
- warning threshold collateral=780,000; drop from initial V=22%.
- shock=-30% -> collateral=700,000, maintenance=116.6666667%, equity=100,000.
- restoring u requires repayment `600,000-700,000/1.66` =178,313.253012… OR additional eligible collateral=296,000.
- substituting each action independently restores 166%; never add both actions as a single compulsory amount.
- -100% shock -> collateral 0, repayment 600,000, additional collateral 996,000.

These defaults illustrate a configurable model. Product rules vary; do not copy margin-trading rules into a stock-pledge contract or assert actual liquidation timing.

## 4. Retirement model

Whole-year ages A (now), R (target), H (horizon): `18<=A<=R<H<=120`. Monthly simulation intervals start at A and stop at H, with `12*(H-A)` periods. An alternative retirement search evaluates integer ages from A through H-1.

Inputs: investable net liquid assets W>=0, monthly contribution C>=0 during work, retirement spending E>=0, optional monthly income I>=0 from fixed age K (A<=K<=H; default no income), inflation p and nominal annual returns b (before retirement) and a (after).

Real monthly return in phase j:

```text
q_j = ((1+nominalAnnual_j)/(1+p))^(1/12)
work month:       W_m = W_(m-1)*q_before + C
retirement month: W_m = W_(m-1)*q_after + income_m - E
```

Contributions, spending and income occur at month-end. Income applies when the period's start age >=K and the period is in retirement. At target R, there are exactly `12*(R-A)` contribution periods, then `12*(H-R)` retirement periods. Cash flows are constants in today's purchasing power; nominal equivalents at a given month m multiply by `(1+p)^(m/12)` from current age, including all displayed values.

Required target-age principal uses backwards funding with final required balance 0:

```text
B_final=0
B_(m-1)=max(0, (B_m+E-income_m)/q_after)
```

The max allows a later surplus to accumulate without assuming borrowing before it arrives. Today-retirement requirement runs this recurrence with retirement at A and a income-start age K. Required principal at R is expressed in today's purchasing power, not inflated age-R dollars. Income must not shift earlier when testing different retirement ages.

Forward feasibility: a month has shortfall only if grown balance+income is below E beyond monetary tolerance. Balance exactly 0 at H is feasible; zero earlier is feasible only if subsequent income funds expenses. Report first shortfall period/age and stop the funded path there; do not draw negative balances as spendable assets or imply recovery after an unfunded period. Plot thereafter may remain zero with shortfall annotation.

Monthly saving needed: solve the contribution that makes projected W at R >= required target balance. For n working months, factor q=q_before:

```text
projected = W*q^n + C*(q^n-1)/(q-1)
if q=1, projected=W+C*n
neededSaving = max(0, (required-W*q^n)/annuityFactor)
```

n=0 -> saving needed is N/A (“沒有累積期”) and show actual funding gap. Earliest feasible age tests every allowed integer retirement age with income held at K and correct phase assumptions. Maximum target-age spending is the largest E>=0 funded by target assets through H; solve against the same monthly/backwards model with bracketed search, a cap consistent with allowed inputs and <=0.01 TWD spending tolerance. If mathematical capacity exceeds UI cap, label it as above the cap rather than falsely exact.

### Retirement fixtures

1. A=59,R=60,H=61,W=60,000,C=5,000,E=10,000, b=a=p=0%, income=0: target assets=120,000; required at R=120,000; today requirement=240,000; gap=0; needed saving=5,000; maximum spending at R=10,000; earliest feasible retirement=60; no shortfall.
2. A=R=60,H=62,W=0,E=10,000, all rates 0%; I=4,000 beginning age61: requirement=192,000 (12*10,000 +12*6,000). W=192,000 funds horizon exactly; W=0 fails at first payment.
3. A=R=60,H=61,W=120,000,E=10,000, a=p=0%: funded exactly to61; W=110,000 fails at final month's payment. No saving period, so required saving N/A.
4. Annual nominal return equals annual inflation -> real q=1 and zero-real-rate fixtures apply. Real negative returns remain supported.
5. If H is K, retirement income contributes zero payments before horizon. Work-period income is not added on top of C, which already represents net saving.

Additional tests: present/future toggle changes only units, not feasibility; monotonic required principal with spending; negative-real-return path; current-age retirement; no feasible retirement; income larger than spending; scenario calculations independent; income timing checked at exact age boundary. Do not use website screenshot outputs as the sole mathematical oracle.

## 5. Portfolio

### Allocation and instantaneous stress

Asset values V_j>=0 (1–20), debt L_k>=0 (0–10), annual nominal interest r_k>=0:

```text
gross = sum(V_j)
debt = sum(L_k)
equity = gross-debt
weight_j = V_j/gross                  if gross>0
debtRatio = debt/gross                if gross>0
leverage = gross/equity               if equity>0
annualInterest = sum(L_k*r_k)
monthlyInterest = annualInterest/12
stressGross = sum(V_j*(1+shock_j))
stressEquity = stressGross-debt
equityChange = stressEquity-equity
equityReturn = equityChange/equity    only if initial equity>0
```

Stress -100%–100% is one instantaneous price-change assumption, without loan interest for an unspecified duration. Costs are displayed separately and never silently deducted over an invented horizon. Gross=0 -> weights/debtRatio N/A. Initial equity<=0 -> leverage/equityReturn N/A. Positive initial equity with negative stress equity may have return<-100%; retain that loss and label residual debt exposure.

Fixture: assets60,000 and40,000, debt30,000 at4%; gross100,000, equity70,000, weights60/40%, debt ratio30%, leverage1.4285714, annual interest1,200, month100. Shocks -20%/-10% ->stress gross84,000, equity54,000, change -16,000, equity return -22.8571429%.

### Unlevered accumulation

Initial amount W>=0, monthly contribution C>=0, horizon Y whole years, target fractions w_j>=0 sum1 within1e-6, effective annual total returns r_j>-1. No loan inputs in this mode. Monthly factor `q_j=(1+r_j)^(1/12)`.

Initialize each asset W*w_j. Each month, grow each balance by q_j then add C*w_j. After months12,24,… rebalance accumulated total to target w_j with no transaction tax/fee; final rebalance changes weights only, not total. Do not use a single weighted annual CAGR to replace this multi-asset monthly path. Contributions total W+12*Y*C; model gain = ending gross minus contributions. This is an assumed return projection, not historical performance.

Fixtures: W=120,000,C=1,000,Y=1,w=50/50%, both returns0% ->ending132,000, each66,000, gain0. W=100,000,C=0,Y=1,single asset annual12% ->ending112,000. Zero-weight rows must not create ghost balances. Test unequal returns against independently calculated month rows and annual rebalance sum conservation.

## 6. Input/reference checks

Add independent golden fixtures above, numerical properties and browser-visible examples. Include cases with corrupted saved JSON, prototype-related keys, invalid/negative periods, malformed rate segments, weights off100%, excessive file/row size and boundary thresholds. Exports preserve model units and timing. Formula changes update this contract and affected tests together, with a reason recorded in the PR.

Lender-related public reference: [SinoPac stock loan FAQ](https://www.sinotrade.com.tw/newweb/loan-zone/?strProd=0210). This source helps explain why ratios are configurable; it does not define a universal contract. Loan/retirement/portfolio equations are the site's declared mathematical models, not source quotations.
