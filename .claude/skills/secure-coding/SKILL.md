---
name: secure-coding
description: Security checklist and threat-model prompts for changes in this Express/Sequelize + React codebase (auth, roles, IDOR, mass assignment, payments, uploads, SQL, XSS, secrets). Use when writing or reviewing code that touches user data, money, files, or permissions.
---

Reference: `docs/security/threat-model.md`, `docs/security/security-audit.md`, OWASP ASVS L2.

## Per-route checklist
- [ ] Authenticated via `backend/src/middleware/auth.js` (unless intentionally public — document why).
- [ ] Role check for admin/superadmin/advisor actions — server-side.
- [ ] Ownership: resource loaded with `where: { id, user_id: req.user.id }` (or role exemption).
- [ ] Writable fields whitelisted; `role`, `app_role`, `is_premium`, `status`, `user_id`, `amount`, `verified*` never taken from body.
- [ ] Input validated (types, lengths, enums); list endpoints paginated with a max `limit`.
- [ ] `sequelize.query` uses `replacements`; no `literal()` with user input; sort/filter keys whitelisted.
- [ ] Errors generic to client; no stack traces; logs exclude passwords, tokens, OTPs, card/bank data.

## Payments
- [ ] Order amount derived from DB plan price, not client.
- [ ] `razorpay_signature` verified with HMAC-SHA256 over `order_id|payment_id` using the server secret, constant-time compare.
- [ ] Webhooks verify `X-Razorpay-Signature` on the raw body; idempotent on `payment_id`.
- [ ] Activation + transaction record in one DB transaction.

## Uploads / files
- [ ] Size and MIME/extension allowlist; random server-side names; private files only via ownership-checked route.

## Frontend
- [ ] No `dangerouslySetInnerHTML` with untrusted data (sanitise with DOMPurify if unavoidable).
- [ ] No secrets in `VITE_*` vars (they ship to the browser). Razorpay **key id** is public; key secret is not.

## Secrets
- [ ] No hardcoded credentials, no env fallbacks like `|| "dev_secret"` for secrets in production paths.

Record any new finding in `docs/security/security-audit.md` and `TRACKER.md` (SEC-n).
