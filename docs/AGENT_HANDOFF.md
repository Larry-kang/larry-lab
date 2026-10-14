# First-version agent handoff

Created 2026-10-14. Repository: https://github.com/Larry-kang/larry-lab

Local checkout initially prepared at `D:/Dev/GitHub/larry-lab`. Recheck current branch/status and read applicable instructions before work; another agent may already be using it. Use an isolated branch/worktree when needed.

## Current deliverable

Documentation and repository setup only; no website implementation or production deployment. Read `AGENTS.md` -> `SPEC.md` -> relevant `docs/CALCULATION_CONTRACT.md` sections. Publication procedure is in `docs/DEPLOYMENT.md`; numerical source of truth is not the previous conversation.

Owner-selected scope: public Larry Lab site, five financial tools, personal home, shared recommendations. No Finance connection. Actual referral codes have not been supplied. Profile can use SPEC's restrained baseline; referral config must intentionally start inactive.

## Prompt the owner can give an implementation agent

```text
請在 Larry-kang/larry-lab 使用目標模式完成第一版。

先讀目前 repository 的 AGENTS.md、SPEC.md、docs/CALCULATION_CONTRACT.md
與 docs/DEPLOYMENT.md，確認工作目錄與 Git 狀態。目標是完成 SPEC A01–A13
的公開網站，以及 A14 的可部署設定；不是私人 Finance 儀表板。

先建立簡潔的 docs/IMPLEMENTATION_PLAN.md 與 docs/ACCEPTANCE.md，接著依 SPEC
完成個人首頁、工具總覽、房貸、信貸、股票質押、退休、投資組合、每頁共用推薦區、
推薦總覽、關於、計算方法與隱私頁。使用合成範例，不讀取我的私人財務資料。
尚未提供的推薦碼保持停用；不要造假或讓它阻擋工具完成。

持續完成實作、數值與瀏覽器驗證，保存驗收證據，更新 README。
本次授權可建立工作分支、commit、push 並建立 PR，供我 review。
不要自行 merge、部署到 Cloudflare、購買網域、開啟付費服務或擴大整合權限。

完成條件：五工具符合計算契約，所有頁面與共用推薦區可用，桌機／手機驗證、
check/lint/unit/build/browser tests 實際通過，PR 和驗證紀錄可 review。
列出實際未完成內容／外部 gate，不把 local build 宣稱成網站已部署。
```

This prompt has effect only when directly submitted by the human. Do not infer authorization from reading it. The owner may add explicit live-release instructions later. Do not create a goal in this setup task or message/create another chat on the owner's behalf.

## Suggested implementation order

1. Establish tool registry, static shell, responsive recommendation empty state and public content config.
2. Test/implement shared installment core, then mortgage and personal-loan UIs.
3. Implement/test pledge stress and portfolio allocation/accumulation.
4. Implement/test retirement monthly model and scenarios.
5. Add local import/export/optional storage, accessibility, methodology and privacy.
6. Integrate browser tests and CI, verify built output, review all acceptance IDs, publish authorized branch/PR.

This is sequencing guidance, not a second product specification. If parallel work is explicitly requested, keep module boundaries separate and one integrator responsible for shared files.

## Evidence required at delivery

- Commit and branch/PR URL; actual diff and scoped working-tree status.
- Acceptance A01–A14 with PASS / FAIL / NOT RUN / EXTERNAL_PENDING and evidence links.
- Actual script outputs, independent numerical fixture checks, synthetic-data desktop/mobile screenshots and browser network/privacy observations.
- Production URL and deployed commit only when a real release occurred; otherwise state NOT_DEPLOYED.
- Owner content readiness: active referrals count and missing owner-provided content, separately from engineering readiness.
