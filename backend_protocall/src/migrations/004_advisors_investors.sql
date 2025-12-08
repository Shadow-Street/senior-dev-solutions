-- Migration 004: Advisors and Investors
-- Depends on: 001_users_auth.sql

-- Advisors
CREATE TABLE IF NOT EXISTS advisors (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    bio TEXT,
    rating DECIMAL(3,2) DEFAULT 0,
    total_clients INT DEFAULT 0,
    total_earnings DECIMAL(15,2) DEFAULT 0,
    specialization JSON,
    status ENUM('pending', 'active', 'suspended', 'inactive') DEFAULT 'pending',
    verified BOOLEAN DEFAULT FALSE,
    sebi_registration VARCHAR(100),
    experience_years INT,
    success_rate DECIMAL(5,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_advisor_user (user_id),
    INDEX idx_status (status),
    INDEX idx_verified (verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Advisor Subscriptions
CREATE TABLE IF NOT EXISTS advisor_subscriptions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    advisor_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    plan_id CHAR(36),
    status ENUM('active', 'cancelled', 'expired', 'pending') DEFAULT 'pending',
    start_date DATE NOT NULL,
    end_date DATE,
    amount DECIMAL(10,2),
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (advisor_id) REFERENCES advisors(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_end_date (end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Advisor Posts
CREATE TABLE IF NOT EXISTS advisor_posts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    advisor_id CHAR(36) NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    post_type ENUM('analysis', 'recommendation', 'update', 'educational') DEFAULT 'analysis',
    stock_symbol VARCHAR(20),
    media_urls JSON,
    is_premium BOOLEAN DEFAULT FALSE,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (advisor_id) REFERENCES advisors(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_stock_symbol (stock_symbol),
    INDEX idx_published_at (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Advisor Plans
CREATE TABLE IF NOT EXISTS advisor_plans (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    advisor_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_days INT DEFAULT 30,
    features JSON,
    max_subscribers INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (advisor_id) REFERENCES advisors(id) ON DELETE CASCADE,
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Advisor Recommendations
CREATE TABLE IF NOT EXISTS advisor_recommendations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    advisor_id CHAR(36) NOT NULL,
    stock_symbol VARCHAR(20) NOT NULL,
    action ENUM('buy', 'sell', 'hold', 'watch') NOT NULL,
    target_price DECIMAL(15,4),
    stop_loss DECIMAL(15,4),
    entry_price DECIMAL(15,4),
    reason TEXT,
    status ENUM('active', 'achieved', 'stopped', 'expired') DEFAULT 'active',
    confidence INT DEFAULT 50,
    timeframe VARCHAR(50),
    result_percent DECIMAL(8,2),
    closed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (advisor_id) REFERENCES advisors(id) ON DELETE CASCADE,
    INDEX idx_stock_symbol (stock_symbol),
    INDEX idx_status (status),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Advisor Pledge Commissions
CREATE TABLE IF NOT EXISTS advisor_pledge_commissions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    advisor_id CHAR(36) NOT NULL,
    pledge_id CHAR(36),
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (advisor_id) REFERENCES advisors(id) ON DELETE CASCADE,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Investors
CREATE TABLE IF NOT EXISTS investors (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    name VARCHAR(255),
    type ENUM('retail', 'hni', 'institutional') DEFAULT 'retail',
    status ENUM('pending', 'verified', 'suspended') DEFAULT 'pending',
    investment_amount DECIMAL(15,2) DEFAULT 0,
    risk_profile ENUM('conservative', 'moderate', 'aggressive') DEFAULT 'moderate',
    kyc_verified BOOLEAN DEFAULT FALSE,
    pan_number VARCHAR(10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_investor_user (user_id),
    INDEX idx_type (type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Investment Requests
CREATE TABLE IF NOT EXISTS investment_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    investment_type VARCHAR(50),
    notes TEXT,
    approved_by CHAR(36),
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Investor Requests
CREATE TABLE IF NOT EXISTS investor_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    investor_type ENUM('retail', 'hni', 'institutional') DEFAULT 'retail',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    documents JSON,
    verified_by CHAR(36),
    verified_at DATETIME,
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Investments
CREATE TABLE IF NOT EXISTS user_investments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    stock_symbol VARCHAR(20) NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    avg_price DECIMAL(15,4) NOT NULL,
    current_value DECIMAL(15,2),
    profit_loss DECIMAL(15,2),
    profit_loss_percent DECIMAL(8,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_stock_symbol (stock_symbol),
    UNIQUE KEY unique_user_stock (user_id, stock_symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
