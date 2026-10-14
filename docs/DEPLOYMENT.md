# Cloudflare Pages delivery

## Intended configuration

| Setting | Value |
| --- | --- |
| Git repository | `Larry-kang/larry-lab` |
| Platform | Cloudflare Pages, static site |
| Desired project name | `larry-lab` (availability unverified until creation) |
| Production branch | `main` |
| Framework | Astro static output |
| Build command | `npm run build` |
| Output directory | `dist` |
| Repository/root directory | repository root |
| Runtime | supported Node LTS pinned during implementation, consistent with CI |
| Runtime secrets / database | none in v1 |
| Desired hostname | `larry-lab.pages.dev`, not a confirmed live URL |

Current state: NOT_DEPLOYED. Cloudflare account/project/integration have not been configured by this bootstrap task. Merely having a Cloudflare browser tab open proves no integration authorization or project availability.

## Release steps

1. Check current user authorization for Cloudflare connection and production publication. Before integration setup, present exact repository access and have the owner approve new access. Choose only this repository rather than all repositories. No paid services or custom domain purchase.
2. Validate `npm ci`, check/lint/unit/build/browser scripts and built `dist` locally. Record the exact intended release commit and validate owner/referral data. A documentation-only repository cannot be deployed as the application.
3. Use Workers & Pages -> create Pages application -> import Git repository. UI labels may change; verify Pages/static mode. Configure table above and inspect the reviewable settings before publishing.
4. If the desired name is unavailable, present available naming options; do not reserve a misleading brand or claim the desired URL is available. Complete publication only within current authorization.
5. Verify successful deployment of intended commit at the actual returned URL. Check all deep routes, refresh, 404, five calculations using synthetic values, recommendation state, desktop/mobile rendering, downloads and security headers. Build success alone is insufficient.
6. Update canonical/site origin and sitemap to real URL if not already known; redeploy and recheck. Update README and `docs/VALIDATION.md` with actual deployment/commit/time in Asia/Taipei.

## Ongoing branch behavior

Once Pages Git integration is connected, commits to production branch can trigger a live deployment. PR/branch previews may also be public; use only synthetic public fixtures. Align branch controls with intended publication authorization. Never assume a main merge is a local-only operation after integration exists.

## Sources

- https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/
- https://developers.cloudflare.com/pages/configuration/git-integration/
- https://developers.cloudflare.com/pages/configuration/custom-domains/

Verified 2026-10-14. Current Astro docs may favor Workers for new full-stack projects. This site's chosen scope is static Pages; no automatic switch to Workers or SSR.
