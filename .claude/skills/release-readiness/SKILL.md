---
name: release-readiness
description: Produce an evidence-based release readiness report (build, lint ratchet, tests, audits, open P0/P1 security items, migrations, config) for this repo. Use before tagging a release or deploying.
disable-model-invocation: true
---

Run and record actual results:
1. `npm ci && npm run build` (root) and `npm --prefix backend ci`.
2. `npm run lint:ratchet`, `npm test`, `npm --prefix backend test`.
3. `npm audit --omit=dev` root and backend — list Critical/High.
4. `node scripts/tracker.mjs list` — any open P0/P1 `SEC-*` or `DB-*` items block release.
5. Pending migrations since last release (`git diff --name-only <last-tag> -- backend/src/migrations`) — each has rollback + approval.
6. Required env vars documented in `.env.example` / `backend/.env.example`; no secret fallbacks.
7. Output `docs/releases/<version>-readiness.md`: GO / NO-GO with reasons. A clean build is not proof of security; say what was not tested.
