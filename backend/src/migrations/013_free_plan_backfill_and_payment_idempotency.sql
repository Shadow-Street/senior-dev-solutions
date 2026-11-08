-- Migration: 013_free_plan_backfill_and_payment_idempotency.sql
-- Description:
--   1. promo_codes: make sure the columns the promo engine reads exist
--      (min_order_amount, one_time_per_user, applies_to_renewal). Migration 006
--      created `min_purchase` and none of the other two; sequelize.sync() adds
--      them only on a fresh database.
--   2. subscription_transactions: UNIQUE(transaction_id) so one Razorpay payment
--      can be recorded once, whatever the race (the API also checks first).
--   3. Backfill: every existing user without an active platform subscription gets
--      an active, non-expiring Free subscription. New users get theirs at
--      registration; the API also creates it on first read, so this backfill is
--      belt and braces and makes the database agree with what the app shows.
--
-- RE-RUNNABLE: column/index additions are guarded by information_schema checks
-- (same pattern as 012) and the backfill only inserts where no row exists.
--
-- BEFORE RUNNING, for step 2, confirm there are no duplicate payment ids:
--   SELECT transaction_id, COUNT(*) FROM subscription_transactions
--    WHERE transaction_id IS NOT NULL GROUP BY transaction_id HAVING COUNT(*) > 1;
-- If that returns rows, resolve them first; the index statement would fail
-- (the earlier steps are unaffected and a re-run skips them).
--
-- Not run by the assistant. Take a backup and run it in a maintenance window.

-- ---------------------------------------------------------------------------
-- 1. promo_codes columns
-- ---------------------------------------------------------------------------
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `promo_codes` ADD COLUMN `min_order_amount` DECIMAL(10,2) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promo_codes' AND COLUMN_NAME = 'min_order_amount');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `promo_codes` ADD COLUMN `one_time_per_user` BOOLEAN NOT NULL DEFAULT FALSE', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promo_codes' AND COLUMN_NAME = 'one_time_per_user');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `promo_codes` ADD COLUMN `applies_to_renewal` BOOLEAN NOT NULL DEFAULT TRUE', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promo_codes' AND COLUMN_NAME = 'applies_to_renewal');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 2. One row per payment id
-- ---------------------------------------------------------------------------
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `subscription_transactions` ADD UNIQUE INDEX `uq_subscription_txn_payment` (`transaction_id`)', 'DO 0') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_transactions' AND INDEX_NAME = 'uq_subscription_txn_payment');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 3. Free-by-default backfill
-- ---------------------------------------------------------------------------
-- "Platform" subscriptions are those with no advisor and no finfluencer. Free
-- has no end date. The plan must be named Free/Basic AND cost nothing (price,
-- monthly and yearly all 0); if the catalogue has no such plan this inserts nothing.
INSERT INTO subscriptions
    (id, user_id, plan_id, status, type, plan_type, start_date, end_date, auto_renew, billing_cycle, created_at, updated_at)
SELECT UUID(), u.id, fp.id, 'active', 'standard', fp.name, CURDATE(), NULL, FALSE, 'monthly', NOW(), NOW()
FROM users u
JOIN (
    SELECT id, name FROM subscription_plans
    WHERE LOWER(TRIM(name)) IN ('free', 'basic') AND advisor_id IS NULL AND finfluencer_id IS NULL
      AND COALESCE(is_active, TRUE) = TRUE
      AND COALESCE(price, 0) = 0 AND COALESCE(price_monthly, 0) = 0 AND COALESCE(price_annually, 0) = 0
    ORDER BY price ASC, created_at ASC
    LIMIT 1
) fp
WHERE NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = u.id
      AND s.status = 'active'
      AND s.advisor_id IS NULL
      AND s.finfluencer_id IS NULL
      AND (s.end_date IS NULL OR s.end_date > NOW())
);

-- ===========================================================================
-- ROLLBACK (run manually, in this order; not executed by the migration runner)
-- ===========================================================================
-- Removes the Free rows this migration (or the API) created. Non-expiring,
-- non-renewing Free rows are only ever created by the Free-by-default logic.
-- DELETE FROM subscriptions
--  WHERE end_date IS NULL AND auto_renew = FALSE AND type = 'standard'
--    AND LOWER(TRIM(plan_type)) IN ('free', 'basic') AND advisor_id IS NULL AND finfluencer_id IS NULL;
-- ALTER TABLE subscription_transactions DROP INDEX uq_subscription_txn_payment;
-- The promo_codes columns are harmless to keep. If this migration created them:
-- ALTER TABLE promo_codes DROP COLUMN applies_to_renewal;
-- ALTER TABLE promo_codes DROP COLUMN one_time_per_user;
-- ALTER TABLE promo_codes DROP COLUMN min_order_amount;
