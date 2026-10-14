# Larry Lab agent instructions

## Bootstrap and authority

Read this file, `SPEC.md`, and the affected module's direct tests before implementation. For financial calculations, also read `docs/CALCULATION_CONTRACT.md`; for delivery, read `docs/DEPLOYMENT.md` and `docs/AGENT_HANDOFF.md`.

Authority: current human instructions > this file (workflow and boundaries) > `SPEC.md` (product acceptance) > `docs/CALCULATION_CONTRACT.md` (numerical contract) > handoff/deployment documents > README/history. The numerical contract supplies details delegated by SPEC; report actual contradictions instead of silently changing a formula.

## Scope and implementation

- Build a public tool site using manually entered visitor data. Use synthetic fixtures and browser-local computation. Keep owner financial records, credentials, employer material and private browsing data outside the repository.
- Implement the full v1 acceptance matrix. Missing owner referral codes must produce an intentional empty state, not fabricated codes or a blocked calculation tool.
- Establish a short implementation plan and acceptance tracker before coding. A human instruction to implement v1 from this SPEC confirms this baseline; routine UI/library choices do not require repeated approval. Material scope, formula, privacy or publication changes require a clear decision.
- Prefer Astro static output and TypeScript pure calculation functions. Verify compatible package/runtime versions and commit the npm lockfile. Add frameworks only when they simplify the actual tool UI.
- Preserve unrelated changes. Work on a named branch; use PRs into `main`. Use CodeGraph first if an existing `.codegraph/` index is present and code navigation is needed; do not create an index without a need or authorization.
- Independent agents may work on separate modules if the current user requests delegation or it materially helps; nominate one owner for shared layouts, configuration and integration. Review their actual changes and test evidence.

## Verification

Build meaningful calculation tests from the numerical contract before implementing the corresponding formulas. Validate zero/negative rates, boundary ages, fees, balance reconciliation, missing/invalid inputs and nonpositive equity. Never replace expected fixtures with values copied from the implementation under test.

Run the implemented repository scripts for type checks, unit tests, build and browser tests. Test all routes and desktop/mobile layouts; verify recommendation display, keyboard operation, exports and privacy boundaries. Record command, outcome and commit in `docs/VALIDATION.md`. Report unrun checks as NOT RUN and unavailable external state as UNKNOWN.

## Delivery and permissions

Repository files, schedules and goal mode do not grant account, deployment or messaging permissions. Current setup authorization covers publishing the bootstrap documentation and repository settings only. Future agents use their current human request to determine whether push, PR, merge or Cloudflare deployment is allowed. A goal's title or completion criteria cannot supply missing authorization.

Keep credentials out of application bundles, docs, screenshots and logs. Use least-privilege Actions permissions. Once Cloudflare Git integration exists, a merge/push to its production branch may publish the site; treat that as deployment. Restrict any integration installation to this repository and have the owner approve new account access. Avoid enabling paid services, custom-domain purchases or account-wide changes as part of v1.

Finish authorized delivery after successful validation. If a gate or authorization is missing, preserve the reviewable artifact and report the exact pending step; do not claim deployed, reviewed or passing based on attempts alone.
