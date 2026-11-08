-- Migration: 012_advisor_bank_accounts_and_withdrawals.sql
-- Description: Advisor bank accounts (account number encrypted at rest), the
--   columns payout_requests needs to carry an admin-reviewed withdrawal, and an
--   idempotency reference on commission_tracking.
--   Tracker: BE-11. Requires BANK_DATA_KEY in the API's environment.
--
-- RE-RUNNABLE. MySQL 8 has no "ADD COLUMN IF NOT EXISTS", and `mysql < file`
-- stops at the first error, so every ADD COLUMN / ADD INDEX / ADD CONSTRAINT
-- below is guarded: it asks information_schema whether the object exists and
-- only then PREPAREs the ALTER (otherwise it runs the no-op `DO 0`). No
-- DELIMITER or stored procedure is needed, so any statement-splitting runner
-- works. The guarded pattern is checked by backend/test/migration-012.test.js.
--
-- DEPLOY ORDER. server.js runs sequelize.sync(), which creates
-- advisor_bank_accounts from the Sequelize model if the API starts before this
-- migration: CHAR(36) BINARY ids and no foreign keys. Adding the payout_requests
-- foreign key to that table would then fail with error 3780 (incompatible
-- collations). This migration therefore repairs a sync-created table (collation,
-- column types, indexes, foreign keys) instead of assuming it created it, so it
-- is safe to run before OR after the new code has started. Running it first is
-- still preferable. Key columns follow whatever collation users.id has
-- (unicode_ci from the SQL migrations, utf8mb4_bin from sync), see @idcoll.

-- Key columns must use exactly the collation of users.id or the foreign keys
-- are rejected (ER_FK_INCOMPATIBLE_COLUMNS / 3780). Databases built by the SQL
-- migrations use utf8mb4_unicode_ci; databases built by sequelize.sync() use
-- utf8mb4_bin (CHAR(36) BINARY). Read it instead of assuming.
SET @idcoll = COALESCE((SELECT COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'), 'utf8mb4_unicode_ci');

-- ---------------------------------------------------------------------------
-- 1. advisor_bank_accounts
-- ---------------------------------------------------------------------------
-- The full account number exists only as AES-256-GCM ciphertext
-- (account_number_encrypted = v1:base64 of iv | auth tag | ciphertext). The API
-- never returns it; account_last4 is the only fragment stored in clear.
-- Rows are soft-deleted (status = 'removed') so a historical withdrawal can
-- still be traced to the account it was paid into. destination_changed_at is
-- when the payout destination (number / IFSC / holder) last changed; a new or
-- edited destination cannot receive a withdrawal for 24 hours.
CREATE TABLE IF NOT EXISTS advisor_bank_accounts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    account_holder_name VARCHAR(120) NOT NULL,
    bank_name VARCHAR(120) NOT NULL,
    account_number_encrypted TEXT NOT NULL,
    account_last4 CHAR(4) NOT NULL,
    ifsc CHAR(11) NOT NULL,
    account_type ENUM('savings', 'current') NOT NULL DEFAULT 'savings',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('active', 'disabled', 'removed') NOT NULL DEFAULT 'active',
    verified_at DATETIME NULL,
    destination_changed_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_abank_user_status (user_id, status),
    INDEX idx_abank_user_primary (user_id, is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Repair a table that sequelize.sync() created first. Each step is a no-op when
-- the table came from the CREATE above.
-- Only for a table that was never finished by this migration (no fk_abank_user
-- yet): once the FK exists the key columns deliberately follow @idcoll, and a
-- table-wide CONVERT would try to change user_id under its own foreign key.
SET @sql = (SELECT IF(COUNT(*) > 0 AND (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND CONSTRAINT_NAME = 'fk_abank_user') = 0, 'ALTER TABLE `advisor_bank_accounts` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME NOT IN ('id', 'user_id') AND COLLATION_NAME IS NOT NULL AND COLLATION_NAME <> 'utf8mb4_unicode_ci');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD COLUMN `user_id` CHAR(36) NOT NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'user_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD COLUMN `account_holder_name` VARCHAR(120) NOT NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'account_holder_name');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD COLUMN `bank_name` VARCHAR(120) NOT NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'bank_name');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD COLUMN `account_number_encrypted` TEXT NOT NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'account_number_encrypted');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD COLUMN `account_last4` CHAR(4) NOT NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'account_last4');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD COLUMN `ifsc` CHAR(11) NOT NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'ifsc');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD COLUMN `account_type` ENUM(''savings'', ''current'') NOT NULL DEFAULT ''savings''', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'account_type');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD COLUMN `is_primary` BOOLEAN NOT NULL DEFAULT FALSE', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'is_primary');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD COLUMN `status` ENUM(''active'', ''disabled'', ''removed'') NOT NULL DEFAULT ''active''', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD COLUMN `verified_at` DATETIME NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'verified_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD COLUMN `destination_changed_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'destination_changed_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD COLUMN `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'created_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'updated_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- A sync-created table has loose VARCHAR / TINYINT types; tighten them (idempotent).
-- Empty any NULLs first so NOT NULL cannot fail.
UPDATE advisor_bank_accounts SET status = 'active' WHERE status IS NULL OR status = '';
UPDATE advisor_bank_accounts SET account_type = 'savings' WHERE account_type IS NULL OR account_type = '';
UPDATE advisor_bank_accounts SET is_primary = FALSE WHERE is_primary IS NULL;
ALTER TABLE advisor_bank_accounts MODIFY COLUMN account_type ENUM('savings', 'current') NOT NULL DEFAULT 'savings';
ALTER TABLE advisor_bank_accounts MODIFY COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE advisor_bank_accounts MODIFY COLUMN status ENUM('active', 'disabled', 'removed') NOT NULL DEFAULT 'active';
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD INDEX `idx_abank_user_status` (`user_id`, `status`)', 'DO 0') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND INDEX_NAME = 'idx_abank_user_status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD INDEX `idx_abank_user_primary` (`user_id`, `is_primary`)', 'DO 0') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND INDEX_NAME = 'idx_abank_user_primary');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- Align the key columns with users.id (see @idcoll above).
SET @sql = (SELECT IF(COUNT(*) > 0, CONCAT('ALTER TABLE `advisor_bank_accounts` MODIFY COLUMN `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE ', @idcoll, ' NOT NULL'), 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'id' AND COLLATION_NAME <> @idcoll);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) > 0, CONCAT('ALTER TABLE `advisor_bank_accounts` MODIFY COLUMN `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE ', @idcoll, ' NOT NULL'), 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND COLUMN_NAME = 'user_id' AND COLLATION_NAME <> @idcoll);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `advisor_bank_accounts` ADD CONSTRAINT `fk_abank_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE', 'DO 0') FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'advisor_bank_accounts' AND CONSTRAINT_NAME = 'fk_abank_user' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 2. payout_requests: withdrawal workflow columns
-- ---------------------------------------------------------------------------
-- entity_id / entity_type were declared in the Sequelize model but never in
-- migration 006 (sync may have added them); advisor withdrawals use
-- entity_type = 'advisor' and entity_id = advisors.id.
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD COLUMN `entity_id` CHAR(36) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'entity_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD COLUMN `entity_type` VARCHAR(50) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'entity_type');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, CONCAT('ALTER TABLE `payout_requests` ADD COLUMN `bank_account_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE ', @idcoll, ' NULL'), 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'bank_account_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD COLUMN `bank_snapshot` JSON NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'bank_snapshot');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD COLUMN `admin_notes` TEXT NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'admin_notes');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD COLUMN `rejection_reason` TEXT NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'rejection_reason');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD COLUMN `approved_at` DATETIME NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'approved_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD COLUMN `rejected_at` DATETIME NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'rejected_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD COLUMN `paid_at` DATETIME NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'paid_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD COLUMN `cancelled_at` DATETIME NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'cancelled_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD COLUMN `processed_by` CHAR(36) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'processed_by');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD COLUMN `processed_at` DATETIME NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'processed_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD COLUMN `reference_number` VARCHAR(100) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'reference_number');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- bank_account_id must match advisor_bank_accounts.id exactly for the FK.
SET @sql = (SELECT IF(COUNT(*) > 0, CONCAT('ALTER TABLE `payout_requests` MODIFY COLUMN `bank_account_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE ', @idcoll, ' NULL'), 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND COLUMN_NAME = 'bank_account_id' AND COLLATION_NAME IS NOT NULL AND COLLATION_NAME <> @idcoll);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD CONSTRAINT `fk_payout_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `advisor_bank_accounts`(`id`) ON DELETE SET NULL', 'DO 0') FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND CONSTRAINT_NAME = 'fk_payout_bank_account' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD INDEX `idx_payout_entity` (`entity_type`, `entity_id`)', 'DO 0') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND INDEX_NAME = 'idx_payout_entity');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD INDEX `idx_payout_user_status` (`user_id`, `status`)', 'DO 0') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND INDEX_NAME = 'idx_payout_user_status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `payout_requests` ADD INDEX `idx_payout_created` (`created_at`)', 'DO 0') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payout_requests' AND INDEX_NAME = 'idx_payout_created');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- The 006 ENUM ('pending','processing','completed','failed','cancelled') cannot
-- hold approved / rejected / paid. Widen to VARCHAR first, then carry legacy
-- rows onto the new vocabulary. Application code is the single writer of valid
-- transitions (pending -> approved -> paid; pending|approved -> rejected;
-- pending -> cancelled). NULL statuses are repaired before NOT NULL is applied.
UPDATE payout_requests SET status = 'pending' WHERE status IS NULL;
ALTER TABLE payout_requests MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';
UPDATE payout_requests SET status = 'approved' WHERE status = 'processing';
UPDATE payout_requests SET status = 'paid'     WHERE status IN ('completed', 'processed');
UPDATE payout_requests SET status = 'rejected' WHERE status = 'failed';

-- ---------------------------------------------------------------------------
-- 3. commission_tracking: idempotency reference
-- ---------------------------------------------------------------------------
-- Advisor commissions are created server-side from a verified payment
-- (CommissionService). reference_id holds the payment id so the checkout
-- callback and a retry/webhook cannot credit the same payment twice. NULLs are
-- allowed to repeat in a MySQL unique index, so legacy rows are unaffected.
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `commission_tracking` ADD COLUMN `reference_id` VARCHAR(100) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_tracking' AND COLUMN_NAME = 'reference_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `commission_tracking` ADD UNIQUE INDEX `uq_commission_reference` (`reference_id`)', 'DO 0') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_tracking' AND INDEX_NAME = 'uq_commission_reference');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===========================================================================
-- ROLLBACK (run manually, in this order; not executed by the migration runner)
-- ===========================================================================
-- ALTER TABLE commission_tracking DROP INDEX uq_commission_reference;
-- ALTER TABLE commission_tracking DROP COLUMN reference_id;
-- UPDATE payout_requests SET status = 'processing' WHERE status = 'approved';
-- UPDATE payout_requests SET status = 'completed'  WHERE status = 'paid';
-- UPDATE payout_requests SET status = 'failed'     WHERE status = 'rejected';
-- ALTER TABLE payout_requests MODIFY COLUMN status
--     ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending';
-- ALTER TABLE payout_requests DROP INDEX idx_payout_created;
-- ALTER TABLE payout_requests DROP INDEX idx_payout_user_status;
-- ALTER TABLE payout_requests DROP INDEX idx_payout_entity;
-- ALTER TABLE payout_requests DROP FOREIGN KEY fk_payout_bank_account;
-- ALTER TABLE payout_requests DROP COLUMN cancelled_at;
-- ALTER TABLE payout_requests DROP COLUMN paid_at;
-- ALTER TABLE payout_requests DROP COLUMN rejected_at;
-- ALTER TABLE payout_requests DROP COLUMN approved_at;
-- ALTER TABLE payout_requests DROP COLUMN rejection_reason;
-- ALTER TABLE payout_requests DROP COLUMN admin_notes;
-- ALTER TABLE payout_requests DROP COLUMN bank_snapshot;
-- ALTER TABLE payout_requests DROP COLUMN bank_account_id;
-- entity_type / entity_id / processed_by / processed_at / reference_number may
-- predate this migration (006 or sync); drop them only if this migration is what
-- created them.
-- DROP TABLE IF EXISTS advisor_bank_accounts;
-- (Dropping advisor_bank_accounts destroys the encrypted account numbers; take
--  a backup first. Rows with status 'cancelled' are valid in both vocabularies.)
