# Repository baseline

Bootstrap date: 2026-10-14. This is a setup baseline; GitHub live settings are authoritative. Recheck before modifying settings.

- Repository `Larry-kang/larry-lab`, public, default branch `main`.
- Issues enabled; Wiki and Projects disabled for a single documentation source in Git.
- Squash merge enabled; merge commits/rebase merge disabled; merged branches deleted automatically.
- GitHub secret scanning and push protection enabled. Dependabot alerts/security updates enabled; dependency graph becomes useful when implementation adds its manifests/lockfile.
- GitHub Pages not enabled; deployment target is Cloudflare Pages.
- No license chosen, live website URL, collaborators, paid features or Cloudflare GitHub App installation added by bootstrap.
- Topics identify public finance calculators, personal website, Taiwan and Cloudflare Pages.

## Main branch policy

Bootstrap documentation is delivered through a reviewed squash PR. Following bootstrap, `main` protection requires a PR and resolved conversations, linear history, no force push and no deletion, including administrators. Required approval count is zero for a solo-owner project; a human/agent must still review actual diff/evidence. This does not invent an independent approval that never happened.

No required CI check is configured before application CI exists. At first implementation, add the actual stable checks after successful runs and verify branch policy. No code can be represented as tested by documentation-only setup.

GitHub Actions workflow-token default is read-only and Actions may not approve PRs. Real application CI will be added by the implementation agent; repository workflow permissions still require a live readback.
