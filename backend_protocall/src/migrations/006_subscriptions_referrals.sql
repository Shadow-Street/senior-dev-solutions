-- Migration 006: Subscriptions, Referrals and Revenue
-- Depends on: 001_users_auth.sql

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    interval ENUM('monthly', 'quarterly', 'yearly') DEFAULT 'monthly',
    features JSON,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    trial_days INT DEFAULT 0,
    max_users INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    plan_id CHAR(36),
    finfluencer_id CHAR(36),
    type VARCHAR(50),
    status ENUM('active', 'cancelled', 'expired', 'paused', 'trial') DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE,
    auto_renew BOOLEAN DEFAULT TRUE,
    payment_method VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_end_date (end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subscription Transactions
CREATE TABLE IF NOT EXISTS subscription_transactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    subscription_id CHAR(36) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    gateway_response JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Promo Codes
CREATE TABLE IF NOT EXISTS promo_codes (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percent INT,
    discount_amount DECIMAL(10,2),
    max_uses INT,
    uses_count INT DEFAULT 0,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    applicable_to JSON,
    min_purchase DECIMAL(10,2),
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_code (code),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    referrer_id CHAR(36) NOT NULL,
    referred_id CHAR(36),
    code VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('pending', 'converted', 'expired') DEFAULT 'pending',
    reward_amount DECIMAL(10,2) DEFAULT 0,
    reward_paid BOOLEAN DEFAULT FALSE,
    converted_at DATETIME,
    reward_paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_code (code),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Referral Badges
CREATE TABLE IF NOT EXISTS referral_badges (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    required_referrals INT NOT NULL,
    image_url VARCHAR(500),
    reward_amount DECIMAL(10,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Revenue Transactions
CREATE TABLE IF NOT EXISTS revenue_transactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    amount DECIMAL(15,2) NOT NULL,
    type ENUM('subscription', 'pledge', 'event', 'course', 'commission', 'refund', 'other') NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
    source VARCHAR(100),
    reference_id CHAR(36),
    description TEXT,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payout Requests
CREATE TABLE IF NOT EXISTS payout_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_details JSON,
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    processed_at DATETIME,
    processed_by CHAR(36),
    reference_number VARCHAR(100),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Commission Tracking
CREATE TABLE IF NOT EXISTS commission_tracking (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    advisor_id CHAR(36),
    pledge_id CHAR(36),
    event_id CHAR(36),
    amount DECIMAL(15,2) NOT NULL,
    commission_type VARCHAR(50),
    status ENUM('pending', 'approved', 'paid', 'cancelled') DEFAULT 'pending',
    payout_method VARCHAR(50),
    processed_at DATETIME,
    paid_at DATETIME,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_commission_type (commission_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Commission Settings
CREATE TABLE IF NOT EXISTS commission_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    entity_type VARCHAR(50) NOT NULL,
    entity_id CHAR(36),
    commission_percent DECIMAL(5,2) NOT NULL,
    min_amount DECIMAL(10,2),
    max_amount DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_entity_type (entity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refund Requests
CREATE TABLE IF NOT EXISTS refund_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    payment_id CHAR(36),
    user_id CHAR(36) NOT NULL,
    event_id CHAR(36),
    ticket_id CHAR(36),
    amount DECIMAL(15,2) NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    processed_at DATETIME,
    processed_by CHAR(36),
    refund_method VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    vendor_id CHAR(36),
    date DATE NOT NULL,
    status ENUM('pending', 'approved', 'paid', 'rejected') DEFAULT 'pending',
    receipt_url VARCHAR(500),
    created_by CHAR(36),
    approved_by CHAR(36),
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Income
CREATE TABLE IF NOT EXISTS income (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    source VARCHAR(100),
    date DATE NOT NULL,
    reference_id CHAR(36),
    reference_type VARCHAR(50),
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_date (date),
    INDEX idx_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
