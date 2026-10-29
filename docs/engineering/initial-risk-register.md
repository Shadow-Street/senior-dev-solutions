# Initial Risk Register

**Date:** 2026-10-25 · Likelihood and Impact are rated 1–5 · Score = L × I.

| ID | Risk | L | I | Score | Status | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R-1 | Leaked DB dump (user PII and hashes, tokens, settings) on GitHub | 5 | 5 | **25** | Open | Untrack the file, purge history, rotate credentials, legal assessment (remediation plan Phase 0) | Repo owner |
| R-2 | Admin takeover via committed seed passwords if they were ever used in a deployed env | 4 | 5 | **20** | Code fixed; rotation open | Rotate admin passwords; seeds now read env vars | Repo owner |
| R-3 | Free premium or advisor access, and refund fraud, via unverified activation and forged transactions | 4 | 5 | **20** | Open | Payment integrity phase (SEC-6/7/17/19/24) | Backend |
| R-4 | Privilege escalation to super_admin | 5 | 5 | 25 → **3** | Mitigated | Fixed plus regression tests (SEC-3) | Done |
| R-5 | Mass data exfiltration via export, user directory and unscoped transactions | 5 | 5 | 25 → **10** | Partly mitigated | Export fixed (SEC-4); directory and transactions open (SEC-12, SEC-7) | Backend |
| R-6 | API outage from an unauthenticated webhook request | 4 | 4 | 16 → **2** | Mitigated | SEC-8 fix and tests | Done |
| R-7 | Double charges, refunds and vote counts from races and replays | 3 | 4 | **12** | Open | Transactions, unique keys, idempotency (TD-5) | Backend/DB |
| R-8 | Accidental production DB wipe through a script | 2 | 5 | 10 → **4** | Partly mitigated | Guard on reset/seed scripts; other fix scripts still unguarded | Backend |
| R-9 | Schema drift breaking a deployment (sync vs SQL vs scripts) | 4 | 3 | **12** | Open | Single migration tool (TD-3) | DB |
| R-10 | Index limit reached on `users`/`stocks`/`feature_configs` (63 duplicate uniques) | 3 | 3 | **9** | Open | Drop the duplicates in an approved migration (TD-4) | DB |
| R-11 | Known-vulnerable dependencies exploited on the request path | 3 | 4 | **12** | Open | `npm audit fix` batches (SEC-20) | DevOps |
| R-12 | XSS → token theft (tokens in localStorage, print-window injection) | 2 | 5 | **10** | Open | SEC-18, SEC-29 | Frontend |
| R-13 | Regressions from changes with no test safety net | 4 | 3 | 12 → **8** | Partly mitigated | Harnesses, 32 tests, CI added; coverage still low | QA |
| R-14 | Chat paywall bypass and impersonation | 4 | 3 | **12** | Open | SEC-11 | Backend |
| R-15 | Behaviour change from today's hardening breaks a hidden caller (e.g. a non-admin screen that wrote settings or features) | 2 | 2 | **4** | Watch | Grep showed only superadmin callers; smoke-test the admin screens before release | QA |
| R-16 | Reset emails silently not sent in production if `PUBLIC_APP_URL` is unset | 3 | 2 | **6** | Watch | Logged error; set the env var (remediation plan 0.4) | DevOps |
