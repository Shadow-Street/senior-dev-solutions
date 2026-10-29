# Security Audit

- **Date:** 2026-10-25
- **Method:** static, read-only review of `backend/src`, the loose scripts and `src/`, plus `npm audit` and a pattern-based secret scan. Nothing was sent to the running app, any database or any external service.
- **Standard:** OWASP Top 10 (2021) and OWASP API Security Top 10 (2023).
- **No secret values appear in this document.**

**Status legend:** ✅ fixed in the working tree (with a regression test in `backend/test/`) · 🟡 partially mitigated · ⛔ open.

> A clean build and passing tests do not prove the application is secure. This audit is static and covered the code paths listed below. There was no dynamic testing (DAST) and no penetration test.

## Summary

| Severity | Total | Fixed | Open |
|---|---|---|---|
| Critical | 7 | 3 | 4 |
| High | 13 | 4 (2 partial) | 9 |
| Medium | 10 | 3 | 7 |
| Low/Info | 9 | 0 | 9 |

**Root cause of most backend findings:** the generic CRUD factory (`backend/src/utils/crudController.js`) is mounted on many resources with authentication but without `ownership`, `protectedFields` or a field allow-list. Roles are read from the DB on every request, which is correct, but several endpoints let users write those DB columns.

## Critical

| ID | Finding | Status | Evidence | Fix / test |
|---|---|---|---|---|
| SEC-1 | **Full production DB dump committed and pushed**: `backup23102026_stock_trading_db.sql` (commit `b3e346a`, on `origin/main`). It contains `users` (emails, bcrypt hashes), `oauth_tokens`, `verification_codes`, `platform_settings`, payments and subscriptions. | ⛔ **needs owner** | `git ls-files` | `.gitignore` now blocks dumps. Still needed from the owner: untrack the file, purge it from history (`git filter-repo`, which requires a force-push), rotate credentials, and assess breach notification. |
| SEC-2 | **Hard-coded admin and super-admin credentials** in seed scripts, committed. Running a script reset existing admin passwords to those values. | 🟡 | `backend/seed_superadmin.js`, `backend/seed_admin.cjs` | The scripts now read `SEED_*` env vars and refuse to run in production (`backend/scripts/lib/guard.js`, `script-guard.test.js`). **The old values are still in git history: rotate them now.** |
| SEC-3 (C-1) | **Any user can make themselves super_admin and premium** via `PUT /api/users/<own-id>` with `{"app_role":"super_admin"}`. | ✅ | `UserController.updateById`, `AdminController.updateUserStatus` | Self-edits strip `PRIVILEGE_FIELDS`. Only a super_admin can grant super_admin, edit or ban a super_admin, or change another user's email, judged on `app_role \|\| role` (`utils/roles.js`). Blank role values are rejected. 10 tests. |
| SEC-4 (C-2) | **Any user can export any table**, including password hashes and gateway secrets: `POST /api/exports {"entity":"User"}`. | ✅ | `export.routes.js` | Admin-only. Credential-bearing models are blocked, secret-looking columns are never selected, filters are limited to plain values on real columns, and CSV formula injection is neutralised. 4 tests. |
| SEC-5 (C-5) | **`POST /<resource>/bulk` bypasses ownership and protected fields** on every CRUD router. Lets a user create wallets with arbitrary balances, send notifications to anyone, post messages as others. | ✅ | `crudController.js` bulk handlers | Bulk create/update/delete are staff-only, and bulk routes are registered before `/:id`. Before, `PUT/DELETE /bulk` hit `/:id`. 3 tests. |
| SEC-6 (C-3) | **Paid plans activated without payment**: `POST /subscriptions/upgrade` → `activateSubscription` never checks payment. Also, the Subscription CRUD accepts `status:"active"` and `end_date:"2099-…"` from the owner. | ⛔ | `subscription.routes.js:87-110, 8-16`, `SubscriptionService.js:153-215, 380-391` | Activate only from a verified payment (create-order → verify / webhook). Add `protectedFields` to the Subscription CRUD. Needs a payment-flow change plus a frontend check (tracked). |
| SEC-7 (C-4) | **Refunds of other customers' Razorpay payments**. Chain: unscoped `GET /funds/transactions` leaks payment ids → forged SubscriptionTransaction → `/subscriptions/cancel` refunds the victim's payment. | ⛔ | `FundController.js:14-34`, `subscription.routes.js:215-217`, `SubscriptionService.js:506-543` | Refund only against server-recorded, verified payments owned by the caller. Scope or staff-gate fund transactions. The investor `PaymentModal` and the fund-manager pages currently create ledger rows from the browser, so a server-side flow is needed first. |

## High

| ID | Finding | Status | Fix / test |
|---|---|---|---|
| SEC-8 (H-1) | **Unauthenticated request crashes the API**: the webhook ran `createHmac(undefined)` outside try. HMAC was over re-serialised JSON, the compare wasn't constant-time, and there was no replay protection. | ✅ (replay ⛔) | Returns 503 when the secret is missing, HMAC is over the raw body (fails closed without it), a strict hex signature with byte-wise `timingSafeEqual`, and `unhandledRejection` is now logged rather than crashing the process. 5 tests. **Open:** dedupe by event id / payment id. |
| SEC-9 (H-2) | Users can write money, status and approval fields: RevenueTransaction, PayoutRequest, RefundRequest, Referral, CommissionTracking, Review, CourseEnrollment, advisor SubscriptionPlan `is_active`, FinInfluencer `is_featured`. | ⛔ | `protectedFields` / allow-lists per entity, with status and amount derived on the server. |
| SEC-10 (H-3) | Admin functions open to any user: platform settings upsert, entity-config, investor/module approvals, financial audit logs, expenses/income, announcements, ads/vendors, portfolio-manager data, events, meetings. | 🟡 | ✅ `PUT /platform/settings/key/:key` is admin-only (test). The rest of the route table below is still ⛔. |
| SEC-11 (H-4) | Chat: anyone can join private or premium rooms (REST and WebSocket), post as another `user_id`, edit or delete others' messages, set participant roles. WS broadcasts leak sender emails. WS `maxPayload` is 100 MiB. | ⛔ | Membership/paywall checks, `user_id` stamped by the server, author/moderator-only edits, no emails in broadcasts, a `maxPayload` limit. |
| SEC-12 (H-5) | Any user can list the user directory (`GET /api/users`, uncapped `limit`, `?role=super_admin`). The `User` include on Subscription returns `password` hashes. | ⛔ | Admin-only minimal listing. A `defaultScope` on `User` that excludes `password`. |
| SEC-13 (H-6) | **Unauthenticated config writes**: `/api/features` POST/PUT/DELETE and `/api/localization/bulk`. | ✅ | Both admin-only. 3 tests. |
| SEC-14 (H-7) | **Password-reset link poisoning**: the link base came from `Origin`/`Host` when `PUBLIC_APP_URL` was unset (it is unset in the local env). | ✅ | Base comes only from `PUBLIC_APP_URL`, with a localhost fallback outside production. 2 tests. **Set `PUBLIC_APP_URL` in every deployed env.** |
| SEC-15 (H-8) | Pledge data readable without login; `PUT /pledges/:id` and `/sessions/:id` update any row with the raw body. | ⛔ | Authenticate, scope to owner or participants, allow-list fields. |
| SEC-16 (FE) | **Payouts run in the browser with gateway secret keys** (`PayoutDetailsModal.jsx`). Staff clients fetch `razorpay_key_secret` / `stripe_secret_key`. | ⛔ | Backend payout endpoint. Secrets only in server env, never in `platform_settings` reads. |
| SEC-17 (FE) | **Client-trusted purchases**: course enrollment (`EnrollmentModal.jsx`) and event tickets (`TicketPurchaseModal.jsx`) are fulfilled from the browser. `UniversalPaymentModal` defaults `enableMockPayment = true`, and `PaymentService.jsx` "simulates" success. | ⛔ | Same create-order → verify → server-side fulfilment flow as subscriptions. Mock off by default and env-gated. |
| SEC-18 (FE) | HTML injection into a same-origin `window.open('')` print window (`ExportManager.jsx`, `FinancialStatement.jsx`). It can read localStorage tokens. | ⛔ | Escape values, or render a React print view. |
| SEC-19 (DB) | No idempotency or transactions on payment verify, webhooks, refunds or subscription activation. Concurrent or replayed requests duplicate ledger rows, invoices and refunds (see database assessment §5). | ⛔ | Managed transactions, unique `razorpay_payment_id`, processed-events table, row locks. |
| SEC-20 | Dependency vulnerabilities. Frontend: 1 critical, 18 high (axios, vite, rollup, react-router, postcss, zod, shell-quote…). Backend: 2 critical (fast-xml-parser, proxy-addr), 15 high (axios, multer, mysql2, sequelize, ws, socket.io-parser, path-to-regexp…). | ⛔ | Non-breaking `npm audit fix` batch, then a reviewed semver-major batch (nodemailer). See remediation plan. |

## Medium

| ID | Finding | Status |
|---|---|---|
| SEC-21 (M-1) | Banned users keep access (login, `authenticate` and WS never check `status`). | ⛔ |
| SEC-22 (M-2) | Login told unknown email apart from wrong password. | ✅ generic message, test |
| SEC-23 (M-3) | `role` set by the client at signup; some checks fall back from `app_role` to `role`. | ✅ register/Google ignore client role, test. Fallbacks to `role` remain (standardise on `app_role`). |
| SEC-24 (M-4) | Payment verify replay: no `order.notes.userId === req.user.id` check, no unique payment id, non-constant-time compare. | ⛔ |
| SEC-25 (M-5) | Settings redaction pattern misses `*_api_key` names served to anonymous `GET /platform/settings`. | ⛔ use a positive allow-list |
| SEC-26 (M-6) | No global rate limit, 50 MB JSON bodies, AI chat cost abuse, OTP resend email-bombing, coupon oracle. | ⛔ |
| SEC-27 (M-7) | Stack traces and raw error messages returned to clients. | 🟡 central JSON error handler added (malformed JSON test). About 21 handlers still return `error.message`. |
| SEC-28 (M-8) | More object-level gaps: `/commissions/advisor/:id`, `/audit/logs/user/:id`, poll vote PUT/DELETE, unauthenticated room-scoped GETs. | ⛔ |
| SEC-29 (FE) | Access and refresh tokens in `localStorage`; JWT in WebSocket query strings. | ⛔ |
| SEC-30 | `SESSION_SECRET` fell back to `"dev_secret"` silently. | ✅ throws at boot in production |

## Low / Info

- L-1: `Math.random()` for invite codes and Google-account passwords.
- L-2: Google login doesn't check `email_verified` before linking.
- L-3: unescaped user names in HTML emails.
- L-4: uploads lack a magic-byte check and per-user quota; file URLs derive from Host when `PUBLIC_API_BASE_URL` is unset.
- L-5: MemoryStore sessions; cookies `secure` only with `NODE_ENV=production`.
- L-6: cron runs on every instance, and NULL `end_date` subscriptions never expire.
- L-7: JWT `algorithms` not pinned to `['HS256']`.
- L-8: bcrypt cost 10 (seed scripts now use 12).
- Unused `md5` and `mock-require` in backend runtime deps.
- Unsafe URLs: 12 `window.open(url)` calls without `noopener`, and 14 user `href`s without scheme validation.

**Verified good:** OTP and reset tokens use CSPRNG, SHA-256 at rest, TTL, attempt limits and constant-time compare. Refresh tokens are hashed and rotated with reuse detection. No raw SQL, `literal()` or SSRF sinks were found. The upload allow-list and private-file ownership checks hold. Helmet and auth rate limiting are present.

## Route authorization table (non-compliant routes at audit time)

| File | Method + path | Auth? | Role? | Concern | Status |
|---|---|---|---|---|---|
| feature | POST/PUT/DELETE `/api/features…` | No | No | Unauthenticated config writes | ✅ |
| localization | POST `/api/localization/bulk` | No | No | Translation defacement | ✅ |
| export | POST `/api/exports` | Yes | No | Full DB dump | ✅ |
| user | PUT `/api/users/:id` (self) | Yes | Partial | Privilege escalation | ✅ |
| platform | PUT `/api/platform/settings/key/:key` | Yes | No | Settings takeover | ✅ |
| any CRUD | POST `/<resource>/bulk` | Write | Skipped | Ownership bypass | ✅ |
| payment | POST `/api/payments/webhook` | Signature | n/a | Crash | ✅ |
| moderation | POST `/api/moderation/inquiries[/submit]` | No | No | Spam (intended public; add a limit) | ⛔ |
| analytics | POST `/api/analytics/events[/track]` | Optional | No | Spoofed `user_id` | ⛔ |
| subscription | POST `/subscriptions/promo-codes/validate` | No | No | Coupon oracle | ⛔ |
| pledge | GET `/api/pledges/{pledges,sessions,executions,access-requests}` | No | No | Data exposure | ⛔ |
| pledge | PUT `/pledges/:id`, `/sessions/:id`; POST `/sessions`, `/executions` | Yes | No | IDOR, mass assignment | ⛔ |
| user | GET `/api/users`, `/api/users/:id`; CRUD `/users/trust-score-logs` | Yes | No | Directory, forged trust scores | ⛔ |
| entityconfig | PUT `/api/entity-configs/type/:type` | Yes | No | Config takeover | ⛔ |
| investment | PUT `/investor-requests/:id/{approve,reject}` | Yes | No | Self-approval | ⛔ |
| module | PUT `/modules/approvals/:id/{approve,reject}`, GET `/pending` | Yes | No | Approval bypass | ⛔ |
| financial | CRUD `/api/financials/audit-logs` | Yes | No | Audit tampering | ⛔ |
| expense / income | CRUD `/api/expenses`, `/api/income` | Yes | No | Company finance data | ⛔ |
| revenue | GET `/revenue/transactions/summary`; CRUD `/revenue/{transactions,payouts}` | Yes | No/Owner | Revenue exposure, status forgery | ⛔ |
| fund | GET/POST/PUT `/api/funds/transactions` | Yes | No | Lists all payment ids; forge/edit | ⛔ |
| subscription | POST `/subscriptions/upgrade`; CRUD `/subscriptions`, `/transactions` | Yes | Owner | Free plans, refund abuse | ⛔ |
| announcement | POST/PUT/DELETE `/api/announcements` | Yes | No | Site-wide banners | ⛔ |
| ads / vendor | CRUD `/ads/campaigns`, `/api/vendors` | Yes | No | Edit anyone's records | ⛔ |
| portfoliomanager | CRUD clients/holdings/invoices/strategies/trade-orders | Yes | No | Client financial data | ⛔ |
| event | PUT/DELETE `/events/:id`; CRUD attendees/check-ins | Yes | No | IDOR | ⛔ |
| meeting | CRUD `/api/meetings`, PUT `/:id/end`; GET `/room/:id/active` (no auth) | Partial | No | IDOR, private-room leak | ⛔ |
| chat / message | join, rooms, participants, messages, pin | Yes | No/Scope | Impersonation, paywall bypass | ⛔ |
| poll | PUT/DELETE `/polls/:id`, `/polls/votes/:id`; GET `/room/:id` (no auth) | Partial | No | Vote tampering | ⛔ |
| influencer | PUT/DELETE `/influencers/posts/:id` | Yes | No | Edit any post | ⛔ |
| referral / commission | `/referrals`, `/referrals/badges`, `/commissions/advisor/:id`, `/tracking` | Yes | Owner/No | Forged rewards, IDOR | ⛔ |
| audit | GET `/audit/logs/user/:id`, `/entity/:t/:id` | Yes | No | Read anyone's audit trail | ⛔ |

Correctly gated (admin): `/api/admin/*`, `/roles`, `/permissions`, `/chat-management/*`, `/moderation/logs`, `/alerts/logs`, plan/stock/course/news/static-page writes, `/files/storage-status`.

## Hard-coded credentials (kind only)

| File:line | Kind | Status |
|---|---|---|
| `backend/seed_superadmin.js` | Super-admin email and password | ✅ removed from code; ⛔ still in history, rotate |
| `backend/seed_admin.cjs` | Admin email and password | ✅ removed from code; ⛔ still in history, rotate |
| `backend/src/config/database.js:4-5` | Fallback DB password literal (file unused) | ⛔ delete the file |
| `backend/add_column_script.js:7`, `check_plans.js:8` | DB password literals | ⛔ |
| `backend/test_refund.js:27`, `backend/test_subscription_flow.js:16,31,65` | Test password, JWT/HMAC secret fallbacks | ⛔ delete or point at a test DB |

`backend/.env` is untracked, which is correct. The Razorpay key ids in `src/` are placeholders (`rzp_test_…`); key ids are public by design.

## Dependency audit (2026-10-25, `npm audit`)

| Package set | Critical | High | Moderate | Low |
|---|---|---|---|---|
| Frontend (root) | 1 | 18 | 5 | 3 |
| Backend | 2 | 15 | 26 | 0 |

Every advisory reports a fix as available. Only `nodemailer` needs a semver-major bump (to 10.x). Many frontend advisories are build-time only (vite, rollup, glob, minimatch), so their runtime exposure is lower. Backend advisories in `express`/`body-parser`/`path-to-regexp`/`proxy-addr`, `multer`, `ws`, `socket.io-parser` and `mysql2` sit on the request path, so they are runtime-relevant.
