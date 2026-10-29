# Tooling Evaluation

**Date:** 2026-10-25. Every choice favours the existing stack and free, maintained, least-privilege tools. Nothing was installed globally. Only test dev-dependencies were added.

## Sources consulted

- Claude Code docs: subagents (https://code.claude.com/docs/en/sub-agents) and skills (https://code.claude.com/docs/en/skills). These confirmed the `.claude/agents/*.md` frontmatter (`name`, `description`, `tools`, `model`, `skills`, `color`…) and the `.claude/skills/<name>/SKILL.md` format (`description`, `allowed-tools`, `argument-hint`, `disable-model-invocation`).
- SonarSource: JS/TS test coverage (https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/test-coverage/javascript-typescript-test-coverage/). `sonar.javascript.lcov.reportPaths`; coverage requires CI-based analysis (automatic analysis off); coverage must be generated before the scanner runs.
- OWASP Top 10 (2021) and API Security Top 10 (2023) as the audit taxonomy.
- `npm audit` output for both packages (run locally).

## Decisions

| Need | Selected | Why | Alternatives (rejected because) | Security / permissions | Cost |
|---|---|---|---|---|---|
| Frontend unit tests | **Vitest 3 + jsdom + Testing Library** | Native to Vite: same transforms and aliases, near-zero config | Jest (needs Babel/ESM config for Vite + JSX) | Dev-only | Free (MIT) |
| Backend tests | **node:test (built in) + supertest 7** | No runner dependency; CommonJS-friendly; `mock.method` stubs Sequelize models so no DB is needed | Jest/Mocha (extra deps, no added value here) | Dev-only; tests force an unresolvable DB host so they can't touch a real DB | Free |
| Coverage | Vitest v8 provider; `node --experimental-test-coverage` with the LCOV reporter | Both emit LCOV for SonarQube | c8/nyc (redundant) | — | Free |
| Lint gate | **ESLint 9 (existing) + custom per-file ratchet** (`scripts/lint-ratchet.mjs`) | 6,237 legacy errors make a hard gate impossible; the ratchet blocks regressions without loosening rules | `--max-warnings` (no per-file granularity); disabling rules (forbidden by the standards) | — | Free |
| CI | **GitHub Actions** (`.github/workflows/ci.yml`) | The repo is on GitHub | — | `permissions: contents: read`; first-party actions pinned to major tags; no deploy steps | Free tier |
| Secret scanning | **gitleaks v8.24.0** (Docker image) on the working tree | Maintained, fast, `--redact` | trufflehog (heavier); gitleaks-action (needs a licence for org accounts) | Read-only mount. History is not scanned in CI, since the known historical leak would fail every run until the purge | Free |
| Dependency updates | **Dependabot** (grouped minor/patch, weekly) | Built into GitHub | Renovate (more config) | Opens PRs only | Free |
| SCA | `npm audit --omit=dev` (report-only for now) | Zero setup | Snyk/Socket (accounts, cost) | — | Free |
| Code quality | **SonarQube Cloud or Server** (config prepared, inactive) | The brief asks for it; LCOV import ready | ESLint alone (no hotspot or duplication tracking) | Token only via `secrets.SONAR_TOKEN`; job gated on `vars.SONAR_ENABLED` | Free for public repos on SonarQube Cloud |
| AI engineering team | **Project subagents + skills + `.claude/settings.json`** | Native Claude Code; versioned with the repo | Third-party plugin marketplaces (not needed; would need vetting) | Reviewers are read-only (`tools: Read, Grep, Glob, Bash`); deny rules for `.env`, the dump, force-push, `reset-schema`; ask rules for commit, push and installs | — |
| Work tracking | **Built-in tracker**: `docs/engineering/TRACKER.md` + `scripts/tracker.mjs` + `tracker` skill + SessionStart hook | Lives in the repo, reviewable in PRs, readable by agents and humans, no external service | GitHub Issues/Projects (needs network and auth; can be added later by syncing IDs) | The hook only runs a local read-only script | Free |

## Considered and deferred

- **TypeScript migration:** too large for the benefit right now (see architecture assessment). Revisit for new modules via `checkJs` and JSDoc.
- **Playwright E2E and visual regression:** valuable for login and checkout, but needs a seeded test database and a running backend. No test environment exists yet. Tracked as QA-4.
- **eslint-plugin-jsx-a11y:** recommended (FE-7). Adding it would add hundreds of errors to the baseline, so do it alongside the accessibility fixes.
- **Semgrep (SAST):** useful. Prefer SonarQube first to avoid duplicated triage. Tracked as OPS-5.
- **Migration tool:** umzug (lightweight, works with the existing Sequelize). Choose during DB-3 with the owner.
- **MCP servers / plugins:** none installed. A GitHub MCP server or `gh` would only be needed to manage issues or PRs, which require authorisation anyway.

## Not verified

- The CI workflow has **not been run** (no push was made). The YAML parses, and each command was run locally, except gitleaks (Docker unavailable locally) and the Sonar step (no project).
- The SonarQube quality gate has **no result**: there is no project, key or token.
