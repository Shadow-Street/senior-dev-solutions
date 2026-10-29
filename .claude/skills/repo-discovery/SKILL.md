---
name: repo-discovery
description: Map an area of this repository (entry points, data flow, dependencies, risk) before changing it. Use before any non-trivial change, when onboarding to an unfamiliar module, or when refreshing docs/engineering/repository-inventory.md.
argument-hint: "[path or feature]"
---

1. Scope: `$ARGUMENTS` (default: whole repo). Exclude `node_modules/`, `dist/`, `uploads/`, `*.sql` dumps, `.env*`.
2. Entry points: frontend `src/main.jsx` → `src/App.jsx` → `src/pages/index.jsx`; backend `backend/server.js` → `backend/src/app.js` → `backend/src/routes/index.js`.
3. For a feature: trace UI component → `src/api/*` call → route file → middleware → controller/service → model/table. Record each hop as `file:line`.
4. Note auth/ownership checks, validation, transactions, external calls (Razorpay, S3, Gemini, Yahoo Finance, SMTP), and existing tests.
5. Size/health: `find <path> -name '*.js*' | xargs wc -l | sort -n | tail`, `npx eslint <path>`.
6. Output: a short map (hops with file:line), risks, and unknowns. Update `docs/engineering/repository-inventory.md` only if the structure changed.

Done when every hop is backed by a file reference and unknowns are listed rather than guessed.
