# Larry Lab v1 SPEC

Version: 1.0 · 2026-10-14 · owner: Larry-kang

Status: implementation-ready baseline requested by the owner. This document authorizes no implementation or external delivery by itself; the next agent follows the owner's task. Current repository contains documentation only.

## 1. Purpose and confirmed requirements

Build a public personal toolbox, initially focused on Taiwan-oriented financial calculators. Visitors manually enter their own assumptions, obtain understandable results and compare scenarios. The site also presents Larry's work for interviews and shares owner referral links through a common sidebar on every page.

Confirmed: brand **Larry Lab**; repository **larry-lab**; GitHub + Cloudflare Pages; personal home; tool index; mortgage, personal-loan, stock-pledge, retirement and portfolio tools; shared referral area and referral directory. This is not the owner's private asset dashboard. No Finance or financial-account integration.

Success: all five tools work with auditable numerical contracts, responsive pages and clear assumptions; a visitor can use them without login; the owner can update profile and referral content without editing every page.

## 2. Implementation baseline and exclusions

Chosen design defaults (not extra user requirements): Traditional Chinese (`zh-Hant`), TWD, static Astro + TypeScript, local calculations, no backend, no accounts, no analytics/tracking SDK in v1. Use npm with a committed lockfile and supported Node LTS compatible with selected packages and Pages. Record actual versions at implementation time.

Astro pre-renders each route. Hydrate only interactive tools; native TypeScript or a small UI island is acceptable. Use pure TypeScript calculation modules with explicit input/output types, no DOM/network access. Charts use a suitable lightweight library or accessible SVG and provide equivalent tabular/text values. No SSR adapter, Pages Functions, KV, D1 or runtime secrets are required.

Excluded from v1: live quotes, banking/broker connections, automatic loan-policy data, financial product rankings, Monte Carlo success probabilities, historical backtests, portfolio transactions, user accounts, cloud saving, blog/CMS, payments, email subscriptions, domain purchase and engineering/AI tools. Additional categories may be added later without rebranding.

## 3. Routes and content

| Route | Required content |
| --- | --- |
| `/` | Larry Lab hero; tagline; five featured tool cards; brief author introduction; GitHub link; referrals |
| `/tools/` | Categories 買房與借貸 / 投資與退休; all five cards with purpose and working links |
| `/tools/mortgage/` | Mortgage calculator |
| `/tools/personal-loan/` | Personal-loan calculator |
| `/tools/stock-pledge/` | Stock-pledge cost and collateral stress calculator |
| `/tools/retirement/` | Retirement calculator |
| `/tools/portfolio/` | Portfolio allocation, stress and accumulation calculator |
| `/recommendations/` | Full referral directory, categories and disclosure; intentional empty state when none enabled |
| `/about/` | Author introduction; site rationale; GitHub/source link; factual AI collaboration attribution |
| `/methodology/` | User-readable assumptions/formulas/limits for five tools; model version and update date |
| `/privacy/` | Local calculation, optional local saving, manual file import/export and external-link behavior |
| 404 | Clear not-found message, home/tools links and same site shell |

Author baseline copy: “Larry｜C#／.NET 後端工程師，關注系統整合、交易可靠性與 AI 協作。” Public links initially use `https://github.com/Larry-kang` and this repository. Do not add employer claims, salary, contact details, photographs or financial holdings without provided/verified public content. About page distinguishes author requirements/design/acceptance from agent-assisted implementation; never claim all code hand-written.

Homepage tagline: “財金、工程與生活實用工具，讓計算與決策更清楚。” Only implemented v1 financial tools have clickable cards; no fake engineering/AI links.

## 4. Shared UX and visual design

Original professional design, not an AlphaLab clone: light neutral background, ink text, restrained teal accent, readable numeric cards, ample spacing. A typography-based Larry Lab wordmark is sufficient. Use system/local fonts and bundled icons; obtain licensed assets if any. Dark mode is optional and not a completion gate.

Shared shell: header with brand/Home/Tools/Recommendations/About; content plus referral sidebar; footer with methodology/privacy/source/disclosure. Current page and tool category are apparent. Do not expose implementation details in calculator flows; technical details belong on About and README.

Desktop >=1100 CSS px: two columns with main content flexible and sidebar around 260–300 px; sticky sidebar beneath header. A long sidebar can scroll without preventing access to its last card. Narrower screens: single column, recommendations below the main result in an accessible collapsible section plus a header/footer entry. It must not cover form controls, results or keyboard focus. Every route includes this shared area, even if its current state is “推薦資訊整理中”.

Each tool: purpose, explicitly labelled inputs, calculate/update interaction, key results, charts/tables, assumptions, scenario comparison and reset/sample controls. Inputs update valid results live or via a clearly labelled calculation button; invalid input must clear or mark previous results stale. Empty fields are not silently converted to zero. Sliders, if provided, accompany editable numeric fields.

Accessibility: semantic headings, visible labels/units, keyboard navigation and focus, error text connected to fields, status beyond color, WCAG AA contrast, table alternatives for charts and reduced-motion support. At 360 px and 200% zoom, navigation/form/results remain usable; wide tables scroll inside their own container.

## 5. Common inputs, storage and exports

- Display TWD with thousands separators; whole dollars in summaries, cents in downloadable schedules. Accept comma-formatted amounts, decimals and paste; reject unsupported currency strings, nonfinite values and excess values with clear errors. Rates are annual percent input and normalized decimals internally.
- Amount range 0–1,000,000,000 TWD; positive loan principal when used, nonnegative fees. Mortgage term 1–600 months, personal loan 1–120 months; stock loan 1–3650 days; retirement ages 18–120; accumulation horizon 1–60 years. Individual financial contract limits take precedence.
- All sample data is invented and labelled 示例, unrelated to owner accounts. Show currency, rate basis, timing, omitted fees and calculation version.
- Default state is in memory only. A visitor may explicitly choose “記住此工具設定” for browser-local saving; it is off initially. Explain shared-device implications and provide per-tool delete plus clear-all controls. A failed/unavailable localStorage must not prevent calculation.
- Export/import tool assumptions using versioned JSON `{schemaVersion, toolId, inputs}` with bounded file size <=100 KB and strict validation; import only recognised fields and show errors without overwriting valid state. Export excludes identifiers/credentials and contains user-entered assumptions only. Imported names render as text.
- Mortgage/personal loan: download full monthly schedule CSV. Retirement/portfolio: download projection CSV. Pledge: scenario CSV. Generate locally, neutralize spreadsheet formula injection in text cells and quote delimiters correctly.
- Share button, if included, shares only the tool URL. No amounts in URL/query/hash, analytics, error logs or external requests. Saving/exporting is user-triggered; clipboard failure has a manual-copy fallback.

## 6. Tool acceptance

Numerical authority: [CALCULATION_CONTRACT](docs/CALCULATION_CONTRACT.md). This section defines user-facing behavior; implementer reads the corresponding formula section before coding.

### M — Mortgage

Input modes: direct loan principal, or property price with down payment / loan-to-value. A mode switch clears conflicting derived fields; price/principal/down payment consistency is visible. Configure months, fixed or piecewise nominal annual rate, repayment method (本息平均 / 本金平均), grace months, and one-time upfront fee. Grace period is inside the original term and strictly shorter than it. Optional monthly income and other loan payments.

Outputs: first/typical/maximum payment, grace payment, post-grace first payment, total principal/interest/fee/cash outflow; remaining-balance chart; every-month schedule and CSV. Show varying payment ranges rather than a false single constant. Monthly burden uses the maximum scheduled payment plus other monthly debts divided by entered income; no approval prediction. Compare 2–3 independent named plans with the same currency and displayed inputs.

### L — Personal loan

One-time disbursement, fixed nominal annual interest, equal total monthly payments, months and fee. Fee deducted at disbursement or paid separately at time zero has the same net cash-flow cost; label chosen mode. Fee must be below principal. Compare 2–3 plans.

Outputs: gross principal, net amount available after fee, payment, total interest, fee, total payment-plus-fee outflow and estimated effective annual cash-flow cost. Do not call this a lender's legally prescribed APR/總費用年百分率. The methodological convention and excluded insurance/late/early repayment costs are visible. Full schedule and CSV.

### S — Stock pledge

Single aggregated collateral market value; eligible loan-to-value, actual loan amount, nominal annual rate, term days; warning threshold and restoration target as user-editable ratios. Defaults are explicitly illustrative (60%, 130%, 166%); not universal broker terms. Actual loan can exceed illustrated borrowing limit in stress input mode, shown as a warning rather than overwritten. Target >= warning threshold.

Outputs: illustrative borrowing limit, loan/net collateral equity, current simplified maintenance ratio, annual interest, average monthly interest and term interest; -10/-20/-30/-50% and one custom shock; threshold collateral value/drop; repayments or additional eligible collateral needed to restore target. Distinguish cash repayment, pledged cash and additional securities. Do not call threshold a guaranteed liquidation price or promise a cure period. State excluded lender haircuts, interest accrual into debt, corporate actions and contractual rules. Borrowing zero yields no debt/no-call status and ratio N/A.

### R — Retirement

Inputs: current age, target retirement age (may equal current), horizon age, investable net assets, monthly contributions, retirement spending, inflation, separate pre-/post-retirement nominal annual returns, optional monthly retirement income and starting age. Contribution/spending/income are today's purchasing power and inflation-adjusted in the model. Explain this requires nominal contributions to rise with inflation. Owner-occupied housing is excluded unless user assumes monetization; future debt payments belong in entered spending.

Show separate cards for “今天退休所需本金” and “目標年齡退休所需本金”; target-age projected assets, gap, required monthly saving, maximum affordable target-age spending, earliest feasible retirement age under these assumptions and first shortfall age if any. Income uses the entered calendar-age start, not a relative retirement offset. No feasible age within horizon -> explicit not reached; never invent an age.

Use 3 scenario columns with editable assumptions: illustrative nominal returns before/after 5/5%, 7/7%, 10/10%, inflation 3%. These are scenario inputs, not promised returns or personalized advice. Toggle chart between today-money and future nominal money and consistently relabel cards. Show planned retirement and shortfall markers. No Monte Carlo probability or assurance that fixed-rate paths are safe.

### P — Portfolio

Two separate modes:

1. Allocation/stress: 1–20 asset rows (name, category, current TWD value, custom shock); 0–10 loan rows (principal, annual interest). Weights use positive gross assets. Display gross assets, debts, equity, debt ratio, gross/equity leverage, annual/monthly interest, value and equity after shocks, absolute equity change and equity return where defined. Compare editable baseline vs alternative as independent portfolios. No automatic trades or recommendations.
2. Accumulation: unlevered initial balance, monthly contribution, 1–60 years, 1–20 target weight/annual total-return rows. Weights must sum to 100% within numerical tolerance. Project each asset, annually rebalance without tax/fees, contribute at month end by target weights. Show total contributions, estimated ending value, gain and yearly chart/table; compare two allocations. Returns include distributions, so dividends are not added twice.

No historical prices, loan-financed accumulation or path inference for daily leveraged ETFs. Explain typed shocks model only the entered change and that daily leverage/path effects are outside v1. Nonpositive equity gives leverage and equity-return N/A, with insolvency/negative-equity text, not division by zero.

## 7. Referral and public content contract

Use one validated source such as `src/content/recommendations.json`. Each item: id, name, category, shortDescription, code (optional), https referralUrl (optional), enabled, disclosure, sortOrder, lastVerifiedAt, offerText (optional), offerExpiresAt (optional). Only enabled entries with a real validated destination may produce outbound CTAs. Code-only entries may permit copy without a link. Render no fake brand endorsement or unverified benefits.

Both sidebar and directory read the same data; filtering/order must be deterministic. Show “透過部分連結註冊，我可能獲得推薦獎勵；請自行確認平台條件。” near referrals. Affiliate links use `rel="sponsored noopener noreferrer"` when opening new tabs. Expired offers lose promotional claims; do not fabricate dates or reviews. A referral cannot change the calculator's result or rank a financial product.

Owner codes/URLs are not supplied. Production config initially has zero active items and the proper empty state. Development tests may use synthetic codes and `https://example.com/` only as fixture data excluded from production config. Lack of real codes does not block functional v1 acceptance; report content readiness separately.

## 8. Privacy, security and discoverability

Pure client calculations; no submission of inputs, auto-saving by default, external script trackers, form backend, account integration or credentials. Hosting necessarily handles ordinary HTTP requests: privacy copy distinguishes this from uploading calculator inputs, and discloses that external referral destinations have their own policies. Bundle fonts/icons locally where possible.

Validate all input/imported JSON/config URLs; render user text without raw HTML; disallow javascript/data URLs. Set appropriate static security headers including referrer policy, content-type protection and a tested CSP compatible with bundled tools. File names/sheets cannot execute spreadsheet formulas. Test unexpected JSON keys/oversized inputs and no private input-bearing network requests.

Every route has unique title/description, zh-Hant language, social preview, canonical only when real production origin is known; create robots/sitemap for actual published origin. Provide working 404 behavior, direct deep-link refresh and navigation. No placeholder canonical domain or false live-site link.

## 9. Structure and engineering deliverables

Suggested boundaries: `src/pages`, shared `src/layouts`/`components`, `src/lib/calculators`, validated `src/content`, unit tests by calculation domain, browser tests by user flow. Keep models independent of UI frameworks and expose documented units.

Deliver npm scripts `dev`, `check`, `lint`, `test`, `test:e2e`, `build`, `preview` with reproducible definitions; npm lockfile; README setup; GitHub Actions running check/lint/unit/build/browser smoke on PR and main with read-only permissions. Pin action revisions where practical. CI status required-check settings are added only after actual checks exist and have passed; do not invent check names.

Maintain `docs/IMPLEMENTATION_PLAN.md`, `docs/ACCEPTANCE.md`, `docs/VALIDATION.md`, and screenshots of synthetic-data desktop/mobile runs. Validation distinguishes implemented, executed, passing and deployed. Project contains a GitHub source link and truthful attribution. Review numeric fixtures independently of the production function.

## 10. Acceptance matrix and completion

| ID | Completion evidence |
| --- | --- |
| A01 | All routes built, direct loads/refresh/navigation and 404 verified |
| A02 | Shared recommendations/empty state on every page at desktop and mobile; no overlap |
| A03 | Mortgage fixed/step/zero rates, both methods, grace, fees, comparison and CSV verified |
| A04 | Personal loan cost/IRR/fees/net disbursement/comparison and CSV verified |
| A05 | Pledge thresholds/shocks/repay-vs-collateral/zero borrowing and CSV verified |
| A06 | Retirement now-vs-target, income start, exact timing, negative/zero returns, scenarios, nominal toggle and CSV verified |
| A07 | Portfolio totals/debts/stress/nonpositive equity, accumulation/rebalance/comparison and CSV verified |
| A08 | Invalid input, reset/example, optional local saving/delete and JSON schema/export/import verified |
| A09 | Financial fixtures and invariants in numerical contract pass; no unchecked formula changes |
| A10 | Keyboard, focus/errors, chart alternatives, 360/768/1440 widths and 200% zoom verified |
| A11 | No credential/private input upload; import/URL/CSV safety and expected headers verified |
| A12 | check/lint/unit/build/browser checks actually pass; clean scoped diff; README and evidence current |
| A13 | Author/referral content truthfully represented; unavailable owner content intentionally disabled |
| A14 | Cloudflare deployment config prepared; if publishing authorized, actual production URL/commit/deep links verified |

Functional v1 completion means A01–A13 with actual evidence plus deployable static output and A14 configuration. Live release additionally requires explicit publication authorization and successful A14 production verification. Unknown referral codes/license/domain do not justify fake content or indefinite implementation pauses.

## 11. Decisions reserved to owner

Owner supplies real referral links/codes and optional benefit text, confirms any expanded biography/photograph, chooses license and custom domain, and approves new GitHub-to-Cloudflare access/production publication. These are separate from routine coding; implementations use safe defaults above and remain reviewable.

## 12. Reference sources

- [Cloudflare Pages Astro guide](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/): Git integration, main/build/dist and project subdomain. Static mode remains the selected baseline; do not accidentally scaffold SSR.
- [Astro deployment docs](https://docs.astro.build/en/guides/deploy/cloudflare/): current documentation may prioritize Workers; owner chose Pages, so verify static Pages compatibility instead of changing platform silently.
- [Cloudflare custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/): optional later domain binding.
- [SinoPac stock-loan FAQ](https://www.sinotrade.com.tw/newweb/loan-zone/?strProd=0210): product-specific collateral terms; not universal rules.
- [FSC financial education](https://moneywise.fsc.gov.tw/): borrower costs and financial education; v1 cash-flow annualization is expressly an estimate, not regulatory APR certification.

Checked 2026-10-14. Financial formulas below are explicit product-model conventions and analytical identities; source references do not make lender terms universal or guarantee future investment returns.
