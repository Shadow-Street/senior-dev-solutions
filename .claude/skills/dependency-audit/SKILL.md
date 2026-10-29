---
name: dependency-audit
description: Audit npm dependencies (root and backend/) for known vulnerabilities, unused/duplicated packages, licenses and supply-chain risk, and propose safe upgrade batches. Use periodically, before releases, and when adding a dependency.
---

1. `npm audit --json` in root and `backend/`; summarise by severity, direct vs transitive, fix availability, and whether the vulnerable path is reachable at runtime (devDependency/build-only vs server).
2. Group upgrades: (a) patch/minor non-breaking via `npm audit fix` (no `--force`), (b) semver-major needing code review (e.g. nodemailer), (c) no fix — mitigate or replace.
3. Before adding a package: check maintenance (last release, open issues), weekly downloads, license (MIT/Apache/BSD preferred), install scripts, and whether an existing dep already covers it.
4. Suspicious/unneeded packages to evaluate: `md5`, `mock-require` in backend runtime deps; `lovable-tagger`, `@flydotio/dockerfile`, both `react-hot-toast` and `sonner` in frontend.
5. After upgrades: build, tests, lint ratchet; record results in TRACKER.
6. Never run `npm audit fix --force` or upgrade majors without approval.
