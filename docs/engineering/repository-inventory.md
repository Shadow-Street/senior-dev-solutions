# Repository Inventory

**Snapshot:** 2026-10-25 · branch `main` @ `2d7799b`, in sync with `origin/main` (github.com/Shadow-Street/senior-dev-solutions) · 63 commits · working tree was clean at start.

## Coverage of this inventory

| Area | Inspected | Depth |
|---|---|---|
| Git state, history, branches | ✅ | Full |
| Root config (package.json, vite, eslint, tailwind, .gitignore, .env.example) | ✅ | Full |
| Backend `src/` (routes, controllers, services, middleware, models, utils) | ✅ | Every route file reviewed for authz (security audit); services spot-read |
| Backend migrations, `table.sql`, scripts | ✅ | Full static review; nothing executed |
| SQL dump | 🟡 | Schema DDL and table names only; row data deliberately not read |
| Frontend `src/` | 🟡 | Architecture, security, a11y and perf via targeted reads and greps; not every one of the 520 files was read line by line |
| Runtime behaviour | ❌ | The app was not started against a database. There was no dynamic testing |
| Production / deployment | ❌ | No deployment config exists in the repo |

## Stack

| Layer | Detail | Evidence |
|---|---|---|
| Runtime | Node v22.22.1, npm 9.2.0 (local) | `node -v` |
| Frontend | React 18.2, Vite 6.1, react-router-dom 7.2, Tailwind 3.4, shadcn/ui (Radix), Redux Toolkit 2, TanStack Query 5 (installed, not wired), axios 1.13, recharts, framer-motion | `package.json` |
| Backend | Express 4.19, Sequelize 6.37, mysql2 3.9, ws 8 + socket.io 4.8, jsonwebtoken 9, bcryptjs, helmet 8, express-rate-limit 8, multer 2 + multer-s3, Razorpay 2.9, @google/generative-ai, nodemailer 7, node-cron 4, redis 5, yahoo-finance2 | `backend/package.json` |
| Database | MySQL 8.0 (`stock_trading_db`); about 119 Sequelize models / 117 tables | dump header, `models/AllModels.js` |
| Origin | Exported from Base44 / Lovable, then migrated to an Express backend (`MIGRATION_STATUS.md`) | `index.html`, `package.json` name `base44-app` |

## Size

| Area | Files | Lines |
|---|---|---|
| `src/` | 520 JS/JSX (439 components, 64 pages) | ~145,600 |
| `backend/src/` | ~130 | ~13,400 |
| Route files | 52 | — |
| Migrations | 13 SQL (duplicate 010/011 numbers) | — |

## Entry points and execution flow

- **Frontend:** `index.html` → `src/main.jsx` → `src/App.jsx` (providers, sonner Toaster) → `src/pages/index.jsx` (lazy routes; `ProtectedRoute` + `Layout`) → pages → `src/lib/apiClient.js` / `src/api/entities.js` → REST `/api/*`.
- **Backend:** `backend/server.js` (cron start, `sequelize.authenticate()`, `sequelize.sync()`, listen :5000) → `backend/src/app.js` (logger, helmet, auth rate limit, CORS allowlist, JSON 50 MB, session, uploads static, central error handler) → `src/routes/index.js` → 52 routers → controllers / `utils/crudController.js` → models.
- **Real-time:** `services/WebSocketService.js` on the same HTTP server, with JWT in the query string.
- **Background:** `services/CronService.js` (subscription expiry and similar) runs in-process.

## Tooling present at start → after this change

| Concern | Before | After |
|---|---|---|
| Tests | None | Vitest + Testing Library (frontend, 5 tests); node:test + supertest (backend, 27 tests) |
| Lint | ESLint 9 flat config, 6,237 errors, no script | `npm run lint`; `npm run lint:ratchet` with a per-file baseline |
| Type checking | None (JS only) | Unchanged; TypeScript migration not recommended now |
| CI/CD | None | `.github/workflows/ci.yml` (build, ratchet, tests+coverage, audit, gitleaks, optional Sonar) |
| Containers | None (`@flydotio/dockerfile` devDep unused) | Unchanged |
| SonarQube | None | `sonar-project.properties` prepared; inactive until key and token exist |
| Claude Code config | None in project | `CLAUDE.md`, `.claude/settings.json`, 8 agents, 11 skills, tracker hook |

## Configuration and secrets (names only)

- Frontend `VITE_API_URL`, `VITE_WS_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_RAZORPAY_KEY_ID` (all public by nature).
- Backend reads 37 env vars, including DB, JWT, session, Razorpay, AWS, SMTP, Gemini, Finnhub, Redis and `PUBLIC_APP_URL`. `backend/.env.example` was missing about 15 of them; they're now documented.
- `.env` files are gitignored and untracked. **`backup23102026_stock_trading_db.sql` is tracked**; see SEC-1.
- `package-lock.json` was listed in `.gitignore` yet tracked. The ignore entry was removed so lockfiles stay authoritative (`npm ci` in CI).

## Critical files (change with care)

`backend/src/middleware/auth.js` · `backend/src/utils/crudController.js` (shared by ~40 routers) · `backend/src/app.js` · `backend/src/controllers/paymentController.js` · `backend/src/services/SubscriptionService.js` · `backend/src/models/index.js` + `AllModels.js` · `src/lib/apiClient.js` · `src/components/context/AuthContext.jsx` · `src/pages/index.jsx`.

## Leftovers / dead weight

`supabase/config.toml` (unused) · `scripts/migrate-api-imports.js` (can't run under ESM) · `backend/src/config/database.js` (unused, contains a fallback password literal) · `PasswordResetService.js`, `PaymentService.js`, `SocialAuthService.js` (unused) · about 100 unimported frontend files (~18.5k lines) and 7 unrouted pages · README refers to a non-existent `backend_protocall` directory.
