# CLAUDE.md

Stock trading / investor community platform. React 18 + Vite SPA in `src/`, Express 4 + Sequelize 6 + MySQL 8 API in `backend/` (CommonJS). Two separate npm packages.

**Standards (authoritative):** `docs/engineering/engineering-standards.md`
**Work tracker:** `docs/engineering/TRACKER.md` — check `node scripts/tracker.mjs next` before starting; update it (skill `tracker`) when an item changes state.

## Commands

```bash
npm run dev                  # frontend on :5173
npm --prefix backend run dev # API on :5000 (needs MySQL + backend/.env)
npm run build                # frontend build
npm run lint:ratchet         # ESLint must not exceed .eslint-baseline.json
npm test                     # frontend tests (Vitest)
npm --prefix backend test    # backend tests (node:test + supertest, no DB)
node scripts/tracker.mjs summary|next|list|check
```

## Hard rules

- Never read or print `.env*` values, tokens, password hashes, or the SQL dump contents.
- Never run DB-touching scripts (`backend/scripts/*`, `backend/seed_*`, `backend/fix_*`, migrations) without explicit approval.
- No commits, pushes, PRs or deploys without explicit approval. Never force-push.
- Never weaken tests, lint rules, auth checks or the lint baseline to make checks pass.
- Backend data routes: authenticate, check role, check ownership, whitelist fields. Payments are verified server-side.
- Report real command output; mark anything not run as "not run".

## Agents and skills

Agents in `.claude/agents/`: `principal-architect` (plans/coordinates), `backend-api-engineer`, `frontend-ui-engineer`, `database-engineer`, `test-engineer`, `devops-quality-engineer`, and read-only reviewers `security-auditor` and `code-reviewer`. Security-sensitive changes require `security-auditor` review; all changes get `code-reviewer`.

Skills in `.claude/skills/`: `tracker`, `repo-discovery`, `secure-coding`, `api-endpoint`, `db-migration-review`, `test-planning`, `dependency-audit`, `ui-review`, `sonarqube`, `release-readiness`, `pr-prep`.

## Docs

`docs/engineering/` (inventory, architecture, technical debt, risk register, database and frontend assessments, tooling evaluation, completion report) and `docs/security/` (threat model, audit, remediation plan).
