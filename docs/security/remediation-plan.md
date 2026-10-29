# Security Remediation Plan

Ordered by risk, then effort. IDs match `docs/security/security-audit.md` and `docs/engineering/TRACKER.md`.

## Phase 0: owner actions (cannot be done by an agent)

| # | Action | Why | How |
|---|---|---|---|
| 0.1 | **Rotate every credential that may appear in the dump or the seed scripts**: the admin and super-admin passwords; the DB password if it was ever reused; Razorpay key secret and webhook secret, SMTP, Gemini, Finnhub and AWS keys if they were ever stored in `platform_settings`; invalidate all refresh tokens (`UPDATE oauth_tokens SET revoked_at = NOW()`). | Treat everything in commit `b3e346a` as exposed. | Provider consoles, plus a DB statement run by the owner. |
| 0.2 | **Untrack and purge the dump**. | It is on `origin/main`. | `git rm --cached backup23102026_stock_trading_db.sql`, commit; then `git filter-repo --path backup23102026_stock_trading_db.sql --invert-paths` and a coordinated force-push (all collaborators re-clone). Ask GitHub support to purge cached views if the repo is public. |
| 0.3 | Decide whether the user data in the dump triggers breach-notification duties (India DPDP Act 2023 / CERT-In 6-hour rule if applicable). | Legal. | Owner and legal counsel. |
| 0.4 | Set `PUBLIC_APP_URL`, `NODE_ENV=production`, `SESSION_SECRET` and `RAZORPAY_WEBHOOK_SECRET` in every deployed environment. | The new fail-fast checks depend on them. | Deployment config. |

## Phase 1: done in this change set (verify, then commit)

SEC-3 self-promotion · SEC-4 export · SEC-5 bulk bypass · SEC-8 webhook crash and signature · SEC-10 (settings write) · SEC-13 features/localization writes · SEC-14 reset-link poisoning · SEC-22 login enumeration · SEC-23 client-chosen role at signup · SEC-27 central error handler · SEC-30 session secret · SEC-2 seed credentials out of code, plus a guard on destructive scripts.
Evidence: `npm --prefix backend test`, 37/37 passing. 29 of those tests fail against the original `HEAD` code (they were verified to catch the bugs). An independent review's medium findings were fixed in the same change set.

## Phase 2: payment integrity (P0, next sprint)

1. **SEC-6 / SEC-24 / SEC-19**: a single server-side purchase flow: `POST /payments/create-order` (amount from DB plan/event/course) → Razorpay checkout → `POST /payments/verify`. Verify must check the signature (constant-time), check `order.notes.userId === req.user.id`, and run activation, ledger, invoice and coupon writes in one `sequelize.transaction()`, idempotent on a UNIQUE `razorpay_payment_id`. Remove `POST /subscriptions/upgrade` activation without payment. Add `protectedFields` (`status`, `end_date`, `start_date`, `amount`, `plan_id` price fields) to the Subscription CRUD.
2. **SEC-7**: refunds only for payments recorded by the server for the caller. Conditional `UPDATE … WHERE status='active'` before calling Razorpay. Fix the `transaction_type` ENUM so the refund ledger write cannot fail after the money has moved.
3. **SEC-17 / SEC-16**: move course enrollment, event tickets and payouts to the server. Default `enableMockPayment` off behind `VITE_ENABLE_MOCK_PAYMENTS`. Delete the "simulate success" branches. Stop serving gateway secrets to any client.
4. Webhook: dedupe by `x-razorpay-event-id` in a `processed_webhook_events` table.
5. Staff-gate or owner-scope `/api/funds/transactions`, after the investor and fund-manager flows stop creating ledger rows from the browser.

**Acceptance:** supertest suites for replay, ownership and amount tampering. Manual test against Razorpay test mode.

## Phase 3: authorization sweep (P1)

Work through the open rows of the route table in the audit, one router per PR. For each: add `adminMiddleware`, `ownership` and `protectedFields` or an allow-list, plus a test asserting 401/403/404 for the wrong caller. Order: users (SEC-12) → pledges (SEC-15) → chat/WS (SEC-11) → revenue/referral/commission/review (SEC-9) → remaining admin routers (SEC-10) → object-level gaps (SEC-28). Add `User.defaultScope` to exclude `password`. Check `status` for banned users in login, `authenticate` and WS (SEC-21).

## Phase 4: hardening (P2)

- SEC-20 dependencies: `npm audit fix` (no `--force`) in both packages → build and tests → commit. Then `nodemailer@10` as a separate reviewed PR. Remove the unused `md5`, `mock-require`, `react-hot-toast` (move its 3 users to sonner), `lovable-tagger`.
- SEC-26: global rate limiter (for example 300 req / 15 min / IP), JSON limit around 1 MB (check upload paths first), per-user AI quota, OTP resend throttle.
- SEC-25: replace the regex redaction of platform settings with an allow-list of public keys.
- SEC-29: refresh token in an httpOnly `SameSite=Strict` cookie, access token in memory, WS auth by first message or a short-lived ticket.
- SEC-18: escape print-window HTML. Add a `safeUrl()` helper. Turn `react/jsx-no-target-blank` back on.
- SEC-27: replace the remaining `res.json({ error: error.message })` with generic messages.
- Pin JWT `algorithms: ['HS256']`. Raise bcrypt cost to 12. Check `email_verified` on Google link.

## Phase 5: continuous assurance

- CI (`.github/workflows/ci.yml`): build, lint ratchet, tests, `npm audit` (report-only → blocking once Phase 4 is done), gitleaks on the working tree.
- Enable SonarQube once a project key exists (see the `sonarqube` skill).
- Have the `security-auditor` agent review every PR touching auth, payments, uploads or SQL.
- Re-run this audit after Phase 3 and update the status columns.
