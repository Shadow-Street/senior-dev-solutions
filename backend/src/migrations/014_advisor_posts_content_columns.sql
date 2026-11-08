-- Migration: 014_advisor_posts_content_columns.sql
-- Description:
--   advisor_posts was created by sequelize.sync() from a model that only had
--   (advisor_id, content, media_urls, status, likes_count, comments_count,
--   is_pinned). The Advisor Dashboard has always sent title, stock symbol,
--   recommendation, target / stop loss and "who can see this" - Sequelize
--   silently dropped them, so every post saved with a body and nothing else and
--   subscriber-only posts could not be enforced. This adds the columns the API
--   now reads and writes:
--
--     title, stock_symbol, post_type, recommendation_type, target_price,
--     stop_loss, time_horizon          the advisory itself
--     notified_at                      set once subscribers have been notified of the post
--     visibility                       'public' (everyone) | 'subscribers'
--     required_plan_id                 optional tier: only subscribers on this
--                                      plan or a dearer one of the same advisor
--
--   Existing rows are left as they are and become visibility = 'subscribers'
--   (the safe default: nothing already written becomes public).
--
--   Also adds UNIQUE(advisors.user_id) so one account can hold one application.
--
-- BEFORE RUNNING, for step 2, confirm there are no duplicate applications:
--   SELECT user_id, COUNT(*) FROM advisors GROUP BY user_id HAVING COUNT(*) > 1;
-- If that returns rows, resolve them first; the index statement would fail
-- (step 1 is unaffected and a re-run skips what already exists).
--
-- RE-RUNNABLE: every ADD is guarded by an information_schema check (same
-- pattern as 012/013).
--
-- RELEASE ORDER: (1) run the duplicate check above, (2) apply this file, (3) restart
-- the API. If the API starts first it degrades to read-only posts (utils/schemaGuard.js)
-- until restarted after the migration. Not run by the assistant.

-- ---------------------------------------------------------------------------
-- 1. advisor_posts columns
-- ---------------------------------------------------------------------------
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_posts` ADD COLUMN `title` VARCHAR(200) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_posts' AND COLUMN_NAME = 'title');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_posts` ADD COLUMN `stock_symbol` VARCHAR(32) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_posts' AND COLUMN_NAME = 'stock_symbol');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_posts` ADD COLUMN `post_type` VARCHAR(32) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_posts' AND COLUMN_NAME = 'post_type');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_posts` ADD COLUMN `recommendation_type` VARCHAR(16) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_posts' AND COLUMN_NAME = 'recommendation_type');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_posts` ADD COLUMN `target_price` DECIMAL(15,4) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_posts' AND COLUMN_NAME = 'target_price');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_posts` ADD COLUMN `stop_loss` DECIMAL(15,4) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_posts' AND COLUMN_NAME = 'stop_loss');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_posts` ADD COLUMN `time_horizon` VARCHAR(64) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_posts' AND COLUMN_NAME = 'time_horizon');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_posts` ADD COLUMN `visibility` VARCHAR(16) NOT NULL DEFAULT ''subscribers''', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_posts' AND COLUMN_NAME = 'visibility');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_posts` ADD COLUMN `required_plan_id` CHAR(36) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_posts' AND COLUMN_NAME = 'required_plan_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_posts` ADD COLUMN `notified_at` DATETIME NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_posts' AND COLUMN_NAME = 'notified_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_posts` ADD INDEX `idx_advisor_posts_advisor_status` (`advisor_id`, `status`, `created_at`)', 'DO 0') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_posts' AND INDEX_NAME = 'idx_advisor_posts_advisor_status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 2. One application per account
-- ---------------------------------------------------------------------------
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisors` ADD UNIQUE INDEX `uq_advisors_user` (`user_id`)', 'DO 0') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisors' AND INDEX_NAME = 'uq_advisors_user' AND NON_UNIQUE = 0);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===========================================================================
-- ROLLBACK (manual; commented out on purpose)
-- ===========================================================================
-- ALTER TABLE `advisors` DROP INDEX `uq_advisors_user`;
-- ALTER TABLE `advisor_posts` DROP INDEX `idx_advisor_posts_advisor_status`;
-- ALTER TABLE `advisor_posts` DROP COLUMN `required_plan_id`;
-- ALTER TABLE `advisor_posts` DROP COLUMN `notified_at`;
-- ALTER TABLE `advisor_posts` DROP COLUMN `visibility`;
-- ALTER TABLE `advisor_posts` DROP COLUMN `time_horizon`;
-- ALTER TABLE `advisor_posts` DROP COLUMN `stop_loss`;
-- ALTER TABLE `advisor_posts` DROP COLUMN `target_price`;
-- ALTER TABLE `advisor_posts` DROP COLUMN `recommendation_type`;
-- ALTER TABLE `advisor_posts` DROP COLUMN `post_type`;
-- ALTER TABLE `advisor_posts` DROP COLUMN `stock_symbol`;
-- ALTER TABLE `advisor_posts` DROP COLUMN `title`;
