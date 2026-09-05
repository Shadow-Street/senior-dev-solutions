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

## Notes

- All tables use InnoDB engine with utf8mb4 character set
- UUIDs are generated using MySQL's UUID() function
- Timestamps use DATETIME with DEFAULT CURRENT_TIMESTAMP
- JSON columns store complex/nested data structures
- Indexes are created for foreign keys and commonly filtered columns
