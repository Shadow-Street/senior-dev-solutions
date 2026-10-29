# Technical Debt Register

**Date:** 2026-10-25 · Effort: S < 1 day, M 1–3 days, L > 3 days. IDs link to `TRACKER.md`.

| ID | Debt | Area | Impact | Effort | Evidence |
|---|---|---|---|---|---|
| TD-1 | Generic CRUD factory is insecure by default (no required access policy or allow-list) | Backend | Security (root cause of ~15 findings) | L | `utils/crudController.js` |
| TD-2 | Money flows fulfilled client-side; no server purchase service | Full-stack | Fraud, financial loss | L | frontend assessment §2 |
| TD-3 | Three schema sources, broken duplicate-numbered migrations, no tracking table | DB | Unreliable deploys, drift | L | database assessment §1–2 |
| TD-4 | 63 duplicate unique indexes on 3 tables | DB | Blocks new indexes; write overhead | M | database assessment §3 |
| TD-5 | No transactions or idempotency on payments, refunds, votes, invoices | Backend/DB | Double charges and refunds, data corruption | M | database assessment §5 |
| TD-6 | Test coverage started at zero; now 32 tests. Frontend line coverage ≈0% | QA | Regressions undetected | L (ongoing) | `npm run test:coverage` |
| TD-7 | 6,237 ESLint errors (4,666 prop-types noise, 1,242 unused vars) | Frontend | Hides real defects | M | `.eslint-baseline.json` |
| TD-8 | ~100 dead files (~18.5k lines), 7 unrouted pages, 18 duplicated components | Frontend | Maintenance cost, confusion | M | frontend assessment §3 |
| TD-9 | Giant page components (4,116 / 3,312 lines) | Frontend | Untestable, risky edits | L | frontend assessment §3 |
| TD-10 | TanStack Query installed but unused; Redux mirrors context; ad-hoc fetching | Frontend | Inconsistent loading/error UX | M | frontend assessment §1 |
| TD-11 | Duplicate entity definitions with conflicting endpoints; `orderBy` silently ignored at 116 call sites | Frontend | Silent functional bugs | M | `src/api/entities.js`, `src/lib/apiClient.js` |
| TD-12 | Stub functions return `{success:true}` without doing anything | Frontend | Users misled | S | `src/api/functions.js` |
| TD-13 | Three toast systems; `react-hot-toast` toasts never render | Frontend | Lost feedback | S | `VoteModal.jsx`, `Advisors.jsx`, `Finfluencers.jsx` |
| TD-14 | Dark-mode palette defined but never activated | UI | Dead CSS | S | `src/index.css` |
| TD-15 | Forms don't use the installed react-hook-form/zod | UI | Inconsistent validation | M | 48 forms |
| TD-16 | Accessibility gaps (icon buttons, clickable divs, labels) | UI | Excludes users; legal risk | M | frontend assessment §5 |
| TD-17 | SuperAdmin chunk 1.08 MB; Razorpay script blocking on every page; 31 uncoordinated pollers | Perf | Slow loads, server load | M | build output |
| TD-18 | Stateful single process (MemoryStore sessions, in-process cron and WS) | Ops | Can't scale; duplicate cron runs | M | `app.js`, `server.js` |
| TD-19 | No deployment, Docker or IaC config; README stale (`backend_protocall`) | Ops/Docs | Onboarding friction | M | repo root |
| TD-20 | Ad-hoc scripts at `backend/*.js` mixing seeds, fixes and tests against the live DB | Backend | Accidental data damage | S | `backend/` |
| TD-21 | Dependency vulnerabilities (3 critical, 33 high across both packages) | Supply chain | Exploitable CVEs | M | `npm audit` |
| TD-22 | Unused deps: `md5`, `mock-require` (runtime), `lovable-tagger`, `@flydotio/dockerfile`, `react-hot-toast` | Supply chain | Attack surface | S | package.json files |
| TD-23 | Base44/Lovable/Supabase leftovers (favicon, title, config) | Frontend | Branding, confusion | S | `index.html`, `supabase/` |
