-- Migration: 015_market_data_credentials.sql
-- Description:
--   Stores market-data provider credentials (today: DhanHQ) in the database so
--   the API can renew the Dhan access token automatically (RenewToken, 24 h
--   validity) and an admin can paste a fresh token without editing .env or
--   restarting. The access token is stored ENCRYPTED (AES-256-GCM, key
--   MARKET_DATA_KEY, see utils/marketDataCrypto.js); nothing else here is secret.
--
--   One row per provider (UNIQUE provider). Columns:
--     client_id               Dhan client id (not secret; masked in the admin UI)
--     access_token_encrypted  v1:<base64 iv|tag|ciphertext>
--     status                  'active' | 'lapsed'  (lapsed = expired or renewal
--                             rejected; Dhan is disabled until a new token is saved)
--     expires_at              when the current token stops working
--     last_renewed_at         last successful RenewToken
--     last_error/_at          short generic reason for the last failure (no upstream
--                             bodies, never the token)
--     lapsed_notified_at      set when admins were alerted about the current lapse,
--                             so each lapse alerts exactly once
--     updated_by              admin who last pasted a token (no FK on purpose: this
--                             must not depend on users.id collation)
--
-- RE-RUNNABLE: CREATE TABLE IF NOT EXISTS, and every column / index is added
-- only when missing (same pattern as 012-014), which also repairs a table that
-- sequelize.sync() created from the model before this ran.
--
-- RELEASE ORDER: (1) set MARKET_DATA_KEY in the API environment, (2) apply this
-- file, (3) restart the API, (4) paste the Dhan token in Super Admin > Platform
-- Settings > Market Data (Dhan). Not run by the assistant.

CREATE TABLE IF NOT EXISTS provider_credentials (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    provider VARCHAR(32) NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    expires_at DATETIME NULL,
    last_renewed_at DATETIME NULL,
    last_error VARCHAR(255) NULL,
    last_error_at DATETIME NULL,
    lapsed_notified_at DATETIME NULL,
    updated_by CHAR(36) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_provider_credentials_provider (provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Repair: add anything a sync()-created table is missing.
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `provider_credentials` ADD COLUMN `status` VARCHAR(16) NOT NULL DEFAULT ''active''', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'provider_credentials' AND COLUMN_NAME = 'status');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `provider_credentials` ADD COLUMN `expires_at` DATETIME NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'provider_credentials' AND COLUMN_NAME = 'expires_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `provider_credentials` ADD COLUMN `last_renewed_at` DATETIME NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'provider_credentials' AND COLUMN_NAME = 'last_renewed_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `provider_credentials` ADD COLUMN `last_error` VARCHAR(255) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'provider_credentials' AND COLUMN_NAME = 'last_error');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `provider_credentials` ADD COLUMN `last_error_at` DATETIME NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'provider_credentials' AND COLUMN_NAME = 'last_error_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `provider_credentials` ADD COLUMN `lapsed_notified_at` DATETIME NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'provider_credentials' AND COLUMN_NAME = 'lapsed_notified_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `provider_credentials` ADD COLUMN `updated_by` CHAR(36) NULL', 'DO 0') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'provider_credentials' AND COLUMN_NAME = 'updated_by');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `provider_credentials` ADD UNIQUE INDEX `uq_provider_credentials_provider` (`provider`)', 'DO 0') FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'provider_credentials' AND INDEX_NAME = 'uq_provider_credentials_provider' AND NON_UNIQUE = 0);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===========================================================================
-- ROLLBACK (manual; commented out on purpose)
-- ===========================================================================
-- Dropping the table forgets the stored Dhan token: Dhan then stays disabled
-- until a token is pasted again (or DHAN_* is bootstrapped from the environment).
-- DROP TABLE IF EXISTS `provider_credentials`;
