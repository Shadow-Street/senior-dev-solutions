# Threat Model

**Date:** 2026-10-25 · **Method:** STRIDE per trust boundary · **Scope:** SPA (`src/`), API (`backend/`), MySQL, and external services.

## System overview

```
Browser (React SPA, tokens in localStorage)
   │  HTTPS REST (axios, Bearer JWT)        WebSocket (JWT in query string)
   ▼                                         ▼
Express API ── auth middleware ── routes/controllers/services ── Sequelize ── MySQL 8
   │                    │
   ├── Razorpay (orders, verify, refunds, webhooks ⇠ inbound)
   ├── AWS S3 (private documents via presigned URLs) / local uploads/
   ├── Google OAuth (ID token verification)
   ├── Gemini (AI chat), Finnhub / Yahoo Finance (market data)
   └── SMTP / SES (OTP, password reset, invoices)
```

## Assets

| Asset | Why it matters |
|---|---|
| User accounts and roles (`users.app_role`, `is_premium`) | Roles gate admin, advisor and fund-manager features, and premium content |
| Money: subscriptions, payments, refunds, payouts, fund wallets, ledger | Direct financial loss, regulatory exposure (GST invoices, refunds) |
| Payment gateway secrets (Razorpay key secret, webhook secret, Stripe) | Lets an attacker issue refunds or payouts and forge webhooks |
| PII: emails, phone, bank and payout details, KYC/SEBI documents | Privacy law (DPDP Act 2023 in India), trust |
| Session material: JWTs, refresh tokens, OTP/reset codes | Account takeover |
| Platform configuration (`platform_settings`, feature flags, translations) | Site-wide defacement and control |
| Chat content and premium rooms | Paid product, privacy |

## Actors

Anonymous visitor · registered user · premium user · advisor / finfluencer / fund manager / vendor · admin · super admin · Razorpay (webhook caller) · insider with repository access · attacker holding a leaked copy of the repo (the DB dump is public if the repo is public or ever was).

## Trust boundaries and STRIDE

| Boundary | Threat (STRIDE) | Example in this codebase | Control (status) |
|---|---|---|---|
| Browser → API | **E**levation | Self-promotion via `PUT /users/:id` | ✅ deny-list on self-edit (SEC-3) |
| Browser → API | **E**levation / **T**ampering | Mass assignment through generic CRUD (status, amount, user_id) | ⛔ per-entity allow-lists (SEC-9) |
| Browser → API | **I**nformation disclosure | Table export, user directory, unscoped transactions | ✅ export (SEC-4); ⛔ others |
| Browser → API | **T**ampering | Client-side fulfilment of purchases, mock payments | ⛔ server-side verify (SEC-6/17) |
| Browser → API | **D**oS | 50 MB bodies, no global rate limit, AI chat cost | ⛔ (SEC-26) |
| Browser ↔ WS | **S**poofing / **E**levation | Join premium rooms, post as others | ⛔ (SEC-11) |
| Razorpay → API | **S**poofing / **D**oS | Forged or replayed webhooks; missing-secret crash | ✅ signature + 503; ⛔ replay dedupe |
| API → Razorpay | **T**ampering | Refund against someone else's payment id | ⛔ (SEC-7) |
| API → MySQL | **T**ampering | Races on votes, refunds, invoices; no transactions | ⛔ (SEC-19) |
| Repository → world | **I**nformation disclosure | Committed DB dump and seed passwords | 🟡 code fixed; ⛔ history purge and rotation (SEC-1/2) |
| Email links | **S**poofing | Reset-link poisoning via `Origin` | ✅ (SEC-14) |
| SPA runtime | **I**nformation disclosure | XSS → localStorage tokens; print-window HTML injection | ⛔ (SEC-18/29) |
| Ops scripts → DB | **T**ampering | `reset-schema.js` / seeds run against prod | ✅ guard (prod refusal, `--confirm`) |

## Abuse cases to keep as regression tests

1. A normal user tries to escalate role or premium through any endpoint → 403 or field ignored. ✅ partially covered
2. A normal user calls any admin route → 403. 🟡 covered for settings, features, localization, export, bulk
3. User A reads or modifies user B's resource by id → 404/403. ⛔ add per resource
4. A payment payload is replayed → no second activation or ledger row. ⛔
5. A webhook arrives with a missing or invalid signature → 503/400, process stays up. ✅
6. A reset request carries an attacker `Origin` → link uses the configured base. ✅

## Assumptions and unknowns

- Whether the GitHub repository is or was public. If yes, treat the dump and seed credentials as fully compromised.
- Production topology (reverse proxy, TLS, `NODE_ENV`) was not available to inspect.
- Razorpay account configuration (webhook secret set? refunds enabled?) is unknown.
