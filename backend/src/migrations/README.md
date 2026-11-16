# Database Migrations

This directory contains all MySQL migration files for the Stock Trading Platform.

## Migration Order

Run migrations in the following order:

1. **001_users_auth.sql** - Users, sessions, roles, and permissions
2. **002_chat_messaging.sql** - Chat rooms, messages, polls, and meetings
3. **003_pledges_funds.sql** - Pledges, fund management, and wallets
4. **004_advisors_investors.sql** - Advisors, investors, and recommendations
5. **005_events_courses.sql** - Events, courses, and finfluencers
6. **006_subscriptions_referrals.sql** - Subscriptions, referrals, and revenue
7. **007_platform_settings.sql** - Settings, notifications, and content
8. **008_stocks_alerts_analytics.sql** - Stocks, alerts, watchlists, and analytics
9. **009_ads_chatbots_files.sql** - Ads, chatbots, files, and moderation

## Running Migrations

### Using MySQL CLI

```bash
# Create database first
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS stock_trading_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run all migrations in order
mysql -u root -p stock_trading_db < src/migrations/001_users_auth.sql
mysql -u root -p stock_trading_db < src/migrations/002_chat_messaging.sql
mysql -u root -p stock_trading_db < src/migrations/003_pledges_funds.sql
mysql -u root -p stock_trading_db < src/migrations/004_advisors_investors.sql
mysql -u root -p stock_trading_db < src/migrations/005_events_courses.sql
mysql -u root -p stock_trading_db < src/migrations/006_subscriptions_referrals.sql
mysql -u root -p stock_trading_db < src/migrations/007_platform_settings.sql
mysql -u root -p stock_trading_db < src/migrations/008_stocks_alerts_analytics.sql
mysql -u root -p stock_trading_db < src/migrations/009_ads_chatbots_files.sql
```

### Using npm script

```bash
cd backend_protocall
npm run migrate
```

## Migration Features

Each migration includes:
- **Primary keys** using UUID (CHAR(36))
- **Foreign key constraints** with appropriate ON DELETE actions
- **Indexes** for frequently queried columns
- **Timestamps** (created_at, updated_at) with auto-update
- **Default values** for common fields
- **Enum types** for status and type fields

## Table Summary

| Migration | Tables Created |
|-----------|---------------|
| 001 | users, user_sessions, roles, permissions, role_permissions, trust_score_logs |
| 002 | chat_rooms, chat_room_participants, messages, message_reactions, message_read_receipts, typing_indicators, meetings, polls, poll_votes |
| 003 | pledge_sessions, pledges, pledge_executions, pledge_access_requests, advisor_pledge_access_requests, pledge_audit_logs, pledge_payments, fund_plans, fund_allocations, fund_wallets, fund_transactions, fund_notifications, fund_withdrawal_requests, fund_payout_requests, fund_invoices |
| 004 | advisors, advisor_subscriptions, advisor_posts, advisor_plans, advisor_recommendations, advisor_pledge_commissions, investors, investment_requests, investor_requests, user_investments |
| 005 | event_organizers, events, event_tickets, event_attendees, event_reviews, event_commission_tracking, event_check_ins, event_promo_codes, event_reminders, event_feedback, finfluencers, influencer_posts, courses, course_enrollments |
| 006 | subscription_plans, subscriptions, subscription_transactions, promo_codes, referrals, referral_badges, revenue_transactions, payout_requests, commission_tracking, commission_settings, refund_requests, expenses, income |
| 007 | platform_settings, entity_configs, notifications, notification_settings, news, static_pages, localizations, email_templates, email_logs |
| 008 | stocks, alert_configurations, alert_settings, watchlists, portfolios, portfolio_holdings, analytics_events, reports, audit_logs, module_approval_requests, reviews |
| 009 | vendors, ad_campaigns, ad_transactions, campaign_billing, chat_bots, bot_conversations, files, moderation_logs, contact_inquiries, feedback |

## Later migrations

| Migration | Purpose |
|-----------|---------|
| 012 | `advisor_bank_accounts` (account number AES-256-GCM encrypted, needs `BANK_DATA_KEY`) and withdrawal-workflow columns on `payout_requests`; widens `payout_requests.status` from ENUM to VARCHAR and remaps legacy values. Rollback SQL is at the bottom of the file. **Re-runnable**: every ADD COLUMN/INDEX/CONSTRAINT is guarded by an `information_schema` check, and it repairs an `advisor_bank_accounts` table that `sequelize.sync()` created first (binary collation, no FKs). Prefer running it before the new API version starts. Also adds `commission_tracking.reference_id` (unique payment id). |
| 014 | `advisor_posts` content columns (title, stock_symbol, post_type, recommendation_type, target_price, stop_loss, time_horizon, visibility, required_plan_id) that the dashboard always sent and `sequelize.sync()` never created; UNIQUE(`advisors.user_id`). Also adds `advisor_posts.notified_at` (subscribers are told about a post once). **Release order: (1) fix/confirm no duplicates (`SELECT user_id, COUNT(*) FROM advisors GROUP BY user_id HAVING COUNT(*) > 1`), (2) apply 014, (3) restart the API.** If the API starts first it does not 500: `utils/schemaGuard.js` detects the missing columns once, serves posts read-only and refuses post writes with 503 until the API is restarted after the migration. Re-runnable; rollback SQL commented at the bottom. |
| 016 | `users.status` ENUM widened to `active, inactive, suspended, banned, pending` (superset of both earlier shapes) and the `user_sanctions` history table (warnings, suspensions, blocks, deactivation, reactivation; who, why, until when, from which screen, `report_id` for moderation). **Apply, then restart the API.** Before it is applied the API runs; suspend/block answer 503 `MIGRATION_PENDING` when the ENUM refuses the value. Re-runnable; rollback commented at the bottom. |
| 017 | `users.trust_score` (INT, default 50) and `users.custom_role_id` (+ index) for Super Admin › User Management (Adjust Trust Score) and Roles & Permissions (custom roles held by a sub_admin); widens a 001-style `users.app_role` ENUM to VARCHAR(50) (superset; needed for sub_admin / portfolio_manager); UNIQUE(`permissions.name`). The new columns are not declared in `models/User.js` on purpose; `utils/userSchema.js` detects them and the admin services use parameterised SQL. **Apply, then restart the API.** Before it is applied, trust-score changes, custom-role assignment and (on 001-built databases) assigning sub_admin / portfolio_manager answer 503; the rest of User Management works. If `permissions` already holds duplicate names the migration lists them and the unique-index step fails without deleting anything: merge the duplicates by hand and re-run. Re-runnable; rollback SQL commented at the bottom. |
| 019 | Content Moderation: `content_reports` (the queue of member reports and chat-filter flags, with each admin decision; UNIQUE(`reporter_id`, `target_type`, `target_id`) collapses repeat reports) and `moderation_actions` (append-only history of every moderation decision, mirrored into `audit_logs`). No change to `moderation_logs` (009) and no backfill from it. **Apply, then restart the API.** Before it is applied, if the tables are missing the moderation endpoints answer 503 `MIGRATION_PENDING`. Re-runnable (also adds the indexes to tables `sequelize.sync()` created first; the UNIQUE key fails if duplicates exist, query in the file); rollback commented at the bottom. |
| 021 | Financials (slide 11): `payment_attempts` (pending/failed Razorpay orders), `refund_requests.status` ENUM -> VARCHAR(32) (adds `failed`), legacy `refund_requests.amount` made NULL-able. See the file header for release order and rollback. |
| 022 | Data cleanup only: deletes credentials the retired Payment Gateway / API Credentials screens wrote into `platform_settings` (`razorpay_key_secret`, `razorpay_webhook_secret`, `stripe_*_secret*`, `stock_data_api_key`, `news_api_key`, `google_maps_api_key`). Nothing read them (Razorpay uses the environment) and the API now refuses to store or return them. No schema change: managed settings are ordinary rows and everything works before it is applied. **Deploy the API first, then apply.** Re-runnable; no rollback (the values belong in the environment). |
| 023 | One participant row per (`chat_room_id`, `user_id`): reports duplicate pairs and adds UNIQUE KEY `unique_participant` only when there are none (deletes nothing). The API works with or without it. Re-runnable; rollback commented at the bottom. |
| 024 | Drops duplicate single-column UNIQUE indexes left by old `sync({ alter: true })` runs on `users.email`, `stocks.symbol`, `feature_configs.feature_key` (63 copies each locally), keeping one per column; no data change. Needed before 017 where a table has hit MySQL's 64-index limit (ER_TOO_MANY_KEYS). Re-runnable. |
| 025 | Advisor recommendation limits and usage tracker (slides 17-18): `advisor_plan_limits` (insert-only history of a plan's limit: `limit_count` NULL = unlimited, `limit_period` week/month, `effective_from`) and `advisor_post_usage` (ledger, UNIQUE (`post_id`, `plan_id`), never deleted so deleting a post gives no allowance back). New tables only, plus an idempotent backfill (INSERT IGNORE) of one usage row per existing published subscriber-only recommendation and reached plan, dated `COALESCE(notified_at, created_at)`. `sequelize.sync()` creates the tables at boot; this file adds the indexes and the backfill (the API does not need the backfill: editing a live post never charges plans it already reached). Until they exist `GET /advisors/posts/usage` answers 503 and publishing is not blocked. Re-runnable; rollback commented at the bottom. |

### Release order for 016-024

Apply 016, then **024 before 017** (017 adds an index; databases with duplicate-index bloat fail with ER_TOO_MANY_KEYS until 024 has run), then 019, 021, 022, 023; restart the API. 022 is data-only and goes after the API deploy. There is no 018 or 020 file. Local DB: all applied 2026-11-11 in the order 016, 024, 017, 019, 021, 022, 023.

`sequelize.sync()` runs at every API boot and **creates missing tables** from the models, so `user_sanctions`, `content_reports` and `moderation_actions` usually exist before 016/019 run (without the migrations' indexes and unique key, which the migrations add). It never alters existing tables, so before the migrations the real gaps are the `users.status` ENUM (016: suspend/block need `suspended`/`banned`) and the `users` columns from 017 (`trust_score`, `custom_role_id`).

## Notes

- All tables use InnoDB engine with utf8mb4 character set
- UUIDs are generated using MySQL's UUID() function
- Timestamps use DATETIME with DEFAULT CURRENT_TIMESTAMP
- JSON columns store complex/nested data structures
- Indexes are created for foreign keys and commonly filtered columns
