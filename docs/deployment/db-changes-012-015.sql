-- =============================================================================
-- Production DB changes for the Nov 2026 release (migrations 012 - 015)
-- Plain CREATE / ALTER / UPDATE / INSERT statements, in run order. MySQL 8.
--
-- BEFORE RUNNING
--   1. Take a backup:  mysqldump --single-transaction --routines <db> > backup.sql
--   2. Run this BEFORE you start the new backend build. The API runs
--      sequelize.sync() on start, which creates missing tables (without the
--      constraints below). If the new backend already started, run the
--      re-runnable files backend/src/migrations/012..015_*.sql instead.
--   3. Collation: every CHAR(36) id below is utf8mb4_unicode_ci. Check yours:
--        SHOW FULL COLUMNS FROM users WHERE Field = 'id';
--      If Collation is not utf8mb4_unicode_ci (e.g. utf8mb4_bin), replace
--      utf8mb4_unicode_ci in the three lines marked  -- <ID COLLATION>.
--   4. The three UNIQUE indexes fail if duplicates exist. These must return 0 rows:
--        SELECT transaction_id FROM subscription_transactions WHERE transaction_id IS NOT NULL GROUP BY transaction_id HAVING COUNT(*) > 1;
--        SELECT user_id FROM advisors GROUP BY user_id HAVING COUNT(*) > 1;
--        SELECT reference_id FROM commission_tracking WHERE reference_id IS NOT NULL GROUP BY reference_id HAVING COUNT(*) > 1;
--
-- If a statement fails with 1060 (Duplicate column), 1061 (Duplicate key name)
-- or 1826 (Duplicate foreign key), that change is already there: skip it and
-- continue with the next statement.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 012  Advisor bank accounts + withdrawals (payout requests)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS advisor_bank_accounts (
    id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (UUID()),      -- <ID COLLATION>
    user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,                    -- <ID COLLATION>
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
    PRIMARY KEY (id),
    INDEX idx_abank_user_status (user_id, status),
    INDEX idx_abank_user_primary (user_id, is_primary),
    CONSTRAINT fk_abank_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE payout_requests ADD COLUMN entity_id CHAR(36) NULL;
ALTER TABLE payout_requests ADD COLUMN entity_type VARCHAR(50) NULL;
ALTER TABLE payout_requests ADD COLUMN bank_account_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;  -- <ID COLLATION>
ALTER TABLE payout_requests ADD COLUMN bank_snapshot JSON NULL;
ALTER TABLE payout_requests ADD COLUMN admin_notes TEXT NULL;
ALTER TABLE payout_requests ADD COLUMN rejection_reason TEXT NULL;
ALTER TABLE payout_requests ADD COLUMN approved_at DATETIME NULL;
ALTER TABLE payout_requests ADD COLUMN rejected_at DATETIME NULL;
ALTER TABLE payout_requests ADD COLUMN paid_at DATETIME NULL;
ALTER TABLE payout_requests ADD COLUMN cancelled_at DATETIME NULL;
ALTER TABLE payout_requests ADD COLUMN processed_by CHAR(36) NULL;
ALTER TABLE payout_requests ADD COLUMN processed_at DATETIME NULL;
ALTER TABLE payout_requests ADD COLUMN reference_number VARCHAR(100) NULL;

ALTER TABLE payout_requests
    ADD CONSTRAINT fk_payout_bank_account FOREIGN KEY (bank_account_id) REFERENCES advisor_bank_accounts (id) ON DELETE SET NULL;
ALTER TABLE payout_requests ADD INDEX idx_payout_entity (entity_type, entity_id);
ALTER TABLE payout_requests ADD INDEX idx_payout_user_status (user_id, status);
ALTER TABLE payout_requests ADD INDEX idx_payout_created (created_at);

-- Payout status becomes: pending | approved | paid | rejected | cancelled
UPDATE payout_requests SET status = 'pending' WHERE status IS NULL;
ALTER TABLE payout_requests MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';
UPDATE payout_requests SET status = 'approved' WHERE status = 'processing';
UPDATE payout_requests SET status = 'paid'     WHERE status IN ('completed', 'processed');
UPDATE payout_requests SET status = 'rejected' WHERE status = 'failed';

-- One commission row per sale (stops double-crediting an advisor)
ALTER TABLE commission_tracking ADD COLUMN reference_id VARCHAR(100) NULL;
ALTER TABLE commission_tracking ADD UNIQUE INDEX uq_commission_reference (reference_id);


-- ---------------------------------------------------------------------------
-- 013  Promo-code rules, payment idempotency, Free plan for every user
-- ---------------------------------------------------------------------------

ALTER TABLE promo_codes ADD COLUMN min_order_amount DECIMAL(10,2) NULL;
ALTER TABLE promo_codes ADD COLUMN one_time_per_user BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE promo_codes ADD COLUMN applies_to_renewal BOOLEAN NOT NULL DEFAULT TRUE;

-- A Razorpay payment id can activate a subscription only once
ALTER TABLE subscription_transactions ADD UNIQUE INDEX uq_subscription_txn_payment (transaction_id);

-- Every user without an active platform subscription gets the Free plan.
-- Needs an active platform plan named 'Free' (or 'Basic') priced 0; inserts
-- nothing if there is none. Safe to run twice.
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


-- ---------------------------------------------------------------------------
-- 014  Advisor post fields (title, stock, targets, visibility) + one advisor
--      profile per user
-- ---------------------------------------------------------------------------

ALTER TABLE advisor_posts ADD COLUMN title VARCHAR(200) NULL;
ALTER TABLE advisor_posts ADD COLUMN stock_symbol VARCHAR(32) NULL;
ALTER TABLE advisor_posts ADD COLUMN post_type VARCHAR(32) NULL;
ALTER TABLE advisor_posts ADD COLUMN recommendation_type VARCHAR(16) NULL;
ALTER TABLE advisor_posts ADD COLUMN target_price DECIMAL(15,4) NULL;
ALTER TABLE advisor_posts ADD COLUMN stop_loss DECIMAL(15,4) NULL;
ALTER TABLE advisor_posts ADD COLUMN time_horizon VARCHAR(64) NULL;
ALTER TABLE advisor_posts ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'subscribers';
ALTER TABLE advisor_posts ADD COLUMN required_plan_id CHAR(36) NULL;
ALTER TABLE advisor_posts ADD COLUMN notified_at DATETIME NULL;
ALTER TABLE advisor_posts ADD INDEX idx_advisor_posts_advisor_status (advisor_id, status, created_at);

ALTER TABLE advisors ADD UNIQUE INDEX uq_advisors_user (user_id);


-- ---------------------------------------------------------------------------
-- 015  Encrypted market-data credentials (Dhan token auto-renewal)
-- ---------------------------------------------------------------------------

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

-- No other schema changes in this release. (Google sign-in, Home page,
-- carousels, ads switch and Facebook-login removal need no DB change.)
