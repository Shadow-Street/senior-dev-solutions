# Engineering Standards

The single source of truth that every agent, skill and contributor follows.
Agents and skills reference this file instead of repeating it.

## 1. Stack (verified 2026-10-25)

| Layer | Technology | Location |
|---|---|---|
| Frontend | React 18, Vite 6, JS/JSX (no TypeScript), Tailwind 3, shadcn/ui (Radix), Redux Toolkit, TanStack Query, react-router-dom 7, axios | `src/` |
| Backend | Node 22, Express 4, Sequelize 6, MySQL 8, `ws`/socket.io, Razorpay, S3 (multer-s3), Gemini, nodemailer, node-cron | `backend/` (CommonJS) |
| Schema | Raw SQL files in `backend/src/migrations/` **and** `sequelize.sync()` at boot (see database assessment) | |
| Package manager | npm (two independent packages: root and `backend/`) | |

## 2. Commands

```bash
npm run build            # frontend production build
npm run lint             # ESLint (frontend)
npm run lint:ratchet     # fails if ESLint error count rises above the baseline
npm test                 # frontend unit tests (Vitest)
npm --prefix backend test   # backend tests (node:test + supertest, no DB needed)
```

## 3. Non-negotiable rules

1. Inspect before changing; keep changes small and reviewable; preserve uncommitted user work.
2. Never read, print, commit or transmit secrets (`.env*`, tokens, keys, password hashes, DB dumps). Refer to secrets by variable name only.
3. Never run DB-mutating scripts (`backend/scripts/reset-schema.js`, `create-db.js`, `seed_*`, `fix_*`, `add_column_script.js`, `force_feature_update.js`, `repair_poll_votes.js`) or migrations against any database without explicit user approval. Never against production.
4. No commits, pushes, PRs, releases or deployments without explicit user approval. Never force-push or rewrite history.
5. Never weaken tests, assertions, lint rules, rate limits, auth checks or quality gates to make a check pass.
6. Never claim a check passed, a vulnerability is fixed or a UI was verified without running/inspecting it. Report skipped steps as skipped.
7. Every behavioural fix ships with a regression test where the harness allows it.
8. Update `docs/engineering/TRACKER.md` when a tracked item changes state.

## 4. Backend conventions

- Every route that reads or mutates user data goes through the auth middleware in `backend/src/middleware/auth.js`; admin routes add the role check from the same file. Ownership (resource `user_id === req.user.id`) is checked server-side, never trusted from the body.
- Never pass `req.body` straight into `Model.create/update`; whitelist fields (see `backend/src/utils/validation.js`). Fields such as `role`, `app_role`, `is_premium`, `status`, `user_id`, `amount` are server-controlled.
- Money: amounts are computed server-side from plan/price records; payment success requires a verified Razorpay signature (HMAC SHA-256) on the server.
- Multi-step financial writes run inside `sequelize.transaction()`.
- Errors: return generic messages to clients, log details server-side without secrets, tokens or passwords.
- Use parameterised queries (`replacements`) for any `sequelize.query`; never interpolate user input.
- Configuration comes from env vars; no secret fallbacks in code (fail fast in production).

## 5. Frontend conventions

- API calls go through the shared client in `src/api/` / `src/lib/`; do not create new axios instances.
- Use design tokens from `tailwind.config.js` / `src/index.css` (CSS variables) instead of raw hex or arbitrary palette classes.
- Forms: react-hook-form + zod. Every async view handles loading, empty, error and success states.
- Never render untrusted HTML without sanitisation; never trust client-side role checks for security.
- Accessibility: semantic elements, labels for inputs, `aria-label` on icon-only buttons, visible focus, `alt` on images.
- Route-level code splitting with `React.lazy` for heavy pages.

## 6. Git workflow

- Branches: `feat/<scope>-<desc>`, `fix/<scope>-<desc>`, `chore/…`, `docs/…`, `security/…`.
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `security:`), matching recent history.
- Before any commit: inspect the staged diff; no secrets, dumps, `dist/`, `node_modules/`, uploads or unrelated changes.
- PRs use `.github/pull_request_template.md` and must pass CI.

## 7. Definition of done

- [ ] Build passes (`npm run build`).
- [ ] Lint ratchet passes; no new ESLint errors in touched files.
- [ ] Relevant tests added/updated and passing (frontend and/or backend).
- [ ] Security impact considered (auth, ownership, validation, secrets).
- [ ] Docs and `TRACKER.md` updated.
- [ ] Diff contains only intended changes.
