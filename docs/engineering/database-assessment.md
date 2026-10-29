# Database Assessment

- **Date:** 2026-10-25
- **Scope:** Sequelize 6 / MySQL 8, `backend/src/models`, `backend/src/migrations/*.sql`, `backend/table.sql`, the ad-hoc scripts, and the `CREATE TABLE` DDL in the committed dump.
- **Method:** static only. No DB connection, no script executed, no row data read.

**Bottom line:** the live schema comes from `sequelize.sync()` plus hand-applied SQL. The 13 migration files describe a different schema and are not what runs. Only one code path uses a DB transaction, and money flows have no idempotency or unique constraints behind them.

## 1. Schema management and drift

- **[High] Three competing sources.**
  - `server.js` calls `sequelize.sync()` on every boot. It creates missing tables but never alters existing ones.
  - `table.sql` is a hand-applied, append-only patch file.
  - The migrations README documents `npm run migrate`, which doesn't exist.
  - Ad-hoc ALTERs live in `fix_schema.cjs`, `add_column_script.js` and `fix_enum.js`.
- **Evidence:** the 119 model tables match the dump's 117 tables with zero column differences, except for `password_resets` and `social_auth`. Those models exist but aren't registered in `models/index.js`.
- **Drift:** 23 tables exist in models and the dump but in no migration. 3 migration-only tables are obsolete. 57 of 94 shared tables differ in columns. Examples: `users` (`full_name/phone/avatar_url` vs `name/role/google_id/profile_image_url`), `fund_transactions` (a wallet-ledger design vs investor-payment columns), `polls`, `subscriptions`.
- **[High] Broken, duplicate-numbered migrations.**
  - `010_auth_extensions.sql` declares an INT FK to the CHAR(36) `users.id`, and uses the MariaDB-only `ADD COLUMN IF NOT EXISTS`.
  - `011_add_tier_to_feature_configs.sql` alters a table no migration creates.
  - `011_refund_request_fields.sql` duplicates `table.sql:44-49`.
- **[Medium]** `table.sql` cannot be replayed safely. Line 412 runs `UPDATE users SET email_verified = 1` with no WHERE, which would bypass OTP verification for new sign-ups. Line 295 deletes from `oauth_tokens`.

## 2. Migration tracking and rollback

**[High]** There is no runner, no `SequelizeMeta`/`schema_migrations` table and no down migrations. Which statements ran in an environment can only be inferred. `002_chat_messaging.sql` uses `DELIMITER`, so it works only through the mysql CLI.

## 3. Integrity

- **[Critical] 63 duplicate UNIQUE indexes** on `users.email` (`email`, `email_2` … `email_63`), plus the same on `stocks.symbol` and `feature_configs.feature_key`, and 6 on `promo_codes`. These are leftovers from old `sync({alter:true})` runs. MySQL's 64-index limit means any new index on these tables fails, and each insert maintains 63 redundant B-trees.
- **[High] Missing FKs.** There are only 41 FKs across 117 tables. Factory-built models (`AllModels.js` `createModel`) can't declare constraints or indexes at all: `poll_votes.user_id`, `refund_requests`, `pm_*`, `fund_wallets`, `payout_requests` and so on.
- **[High] Inconsistent ON DELETE.** Deleting a finfluencer cascades to paid subscriptions and their transactions. `subscriptions.user_id` and `invoices` are RESTRICT, so user deletion fails.
- **[High] Missing business-key UNIQUEs:**
  - `poll_votes(poll_id,user_id)`
  - `chat_room_participants(chat_room_id,user_id)`
  - `course_enrollments(user_id,course_id)`
  - `fund_transactions.transaction_id`
  - `subscription_transactions.transaction_id`
  - `invoices.invoice_number`
  - `refund_requests.razorpay_refund_id`
- **[High] ENUM drift breaks refunds.** `FundTransaction.transaction_type` has no `'refund'` value, yet `SubscriptionService.js:460` writes `'refund'` *after* the Razorpay refund has been issued.
- **[Medium]** NOT NULL is almost absent, even on financial `amount`, `user_id` and `status`.
- **[Low]** DECIMAL precision is mixed: (10,2), (15,2) and (20,2).
- **[Medium]** Factory tables never maintain `updated_at`. Collation is mixed (`utf8mb4_0900_ai_ci` vs `utf8mb4_unicode_ci`). `InvoiceService` mixes local time with UTC.

## 4. Indexes and queries

- **[High] Hot columns unindexed.** `user_id` is indexed on about 15 of 63 tables and `status` on 2 of 63. `created_at` is indexed nowhere, yet every generic list sorts on it.
- Indexes to add first:
  - `messages(chat_room_id, created_at)`
  - `subscriptions(status, end_date)`
  - `subscriptions(razorpay_subscription_id)`
  - `fund_transactions(payment_intent_id)`, `(transaction_id)`
  - `subscription_transactions(user_id, coupon_used)`
  - `revenue_transactions(user_id,status)`
  - `payout_requests(user_id,status)`
- **[Medium]** `oauth_tokens` and `verification_codes` carry every index twice.
- **[Medium] Uncapped queries.** `parseInt(limit)` with no cap or NaN guard in about 10 places (message, pledge, fund, advisor, notification, news, finfluencer). N+1 loops in `FinDataService.js:492,595` and `CronService.js:59-71`.

## 5. Transactions and races ([Critical])

There is exactly one `sequelize.transaction()` (`poll.routes.js:218`) and no row locks anywhere.

- **Payment verify** (`paymentController.js:103-200`) has no idempotency and no ownership check. A replay re-activates the plan and re-inserts the ledger rows, invoice and coupon usage.
- **Webhook `subscription.charged`:** each Razorpay retry adds another period and another ledger row.
- **Refunds** (`SubscriptionService.js:393-490`): the external refund runs first, then four separate writes. The ENUM failure (§3) leaves the subscription active, so the user can refund again. Concurrent `/cancel` calls both refund.
- **Activation** is check-then-create with no lock, so concurrent calls produce two active subscriptions.
- **Poll votes** do a read-modify-write on the JSON counters with no unique key. The generic `/polls/votes` CRUD bypasses `/cast` entirely. `scripts/repair_poll_votes.js` exists because of this.
- **Invoice numbers** are `count(today)+1` with no unique key, so collisions happen. That is a GST compliance risk.
- **Payout balance check** sums and then inserts without a lock, so parallel requests can overdraw.
- **Refresh-token rotation** reads and then calls `save()`, so concurrent refreshes both succeed.

**Fix:** managed `sequelize.transaction(async t => …)`, a UNIQUE `razorpay_payment_id`/`transaction_id`, a processed-webhook-events table, `lock: t.LOCK.UPDATE`, atomic `increment`, conditional `UPDATE … WHERE status='active'` before external calls, and invoice numbers from a sequence table.

## 6. Connection and logging

**[Medium]** No pool config (default max 5 for HTTP, WebSocket and cron combined), no timezone, no TLS, and no retry. `String(process.env.DB_PASSWORD)` becomes `"undefined"` when unset. `logging:false` hides slow queries. Cron starts before `authenticate()` and runs on every instance.

## 7. Destructive scripts

**[Critical → mitigated]** No script had a production guard.

- ✅ Now guarded: `scripts/reset-schema.js` (drops every table, then `sync({force:true})`), `seed_superadmin.js` and `seed_admin.cjs`. They use `backend/scripts/lib/guard.js`: refusal in production, `--confirm=<DB_NAME>` for destructive runs, and credentials from env.
- ⛔ Still unguarded: `fix_enum.js`, `fix_schema.cjs`, `add_column_script.js`, `fix_vip_price.js`, `force_feature_update.js`, `update_plan_pricing.js`, `create_test_plan.js`, `test_refund.js`, `test_subscription_flow.js`. The `test_*` scripts insert plaintext passwords because `User` has no hashing hook.
- Recommendation: move them all to `backend/scripts/dev/` behind the guard, or delete them.

## 8. Sensitive data

- **[Critical]** The committed dump: see SEC-1.
- **Good:** refresh tokens are stored as SHA-256, OTP and reset codes are hashed and attempt-limited, and the CRUD sanitiser strips password and token columns at the top level.
- **Gaps:**
  - Plaintext `oauth_tokens.refresh_token` (legacy column), `user_sessions.token` and `social_auth` tokens.
  - Bank and payout details stored in plain JSON. No column encryption.
  - `pruneTokens`/`prune` are never scheduled. No retention on `audit_logs`, `analytics_events` or `email_logs`.

## Prioritized remediation

1. Purge the dump, rotate credentials, guard all scripts. Guarding is partly done.
2. Make payment verify, webhooks and refunds idempotent and transactional, add the unique keys, fix the `transaction_type` ENUM.
3. Drop the redundant unique indexes on `users`, `stocks`, `feature_configs` and `promo_codes`. Needs a migration with a backup, owner approval and a maintenance window.
4. Lock down `/funds/transactions`, `/polls/votes` and pledge updates. Add the unique pairs and row locks.
5. Adopt umzug with a meta table, baseline from production DDL, retire `table.sql`, the old migrations and the ALTER scripts, and limit `sync()` to development.
6. Add FKs and indexes. Remove CASCADE into financial history.
7. Configure the pool, timezone and TLS. Cap limits, maintain `updated_at`, add NOT NULL and CHECK constraints.
8. Schedule pruning, drop the legacy token column, encrypt payout details, standardise DECIMAL and collation.
