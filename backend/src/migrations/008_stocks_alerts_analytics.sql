-- Migration 008: Stocks, Alerts, Watchlists, Portfolios and Analytics
-- Depends on: 001_users_auth.sql

-- Stocks
CREATE TABLE IF NOT EXISTS stocks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    symbol VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    exchange VARCHAR(50) DEFAULT 'NSE',
    sector VARCHAR(100),
    industry VARCHAR(100),
    market_cap DECIMAL(20,2),
    current_price DECIMAL(15,4),
    day_high DECIMAL(15,4),
    day_low DECIMAL(15,4),
    year_high DECIMAL(15,4),
    year_low DECIMAL(15,4),
    pe_ratio DECIMAL(10,2),
    dividend_yield DECIMAL(5,2),
    volume BIGINT,
    avg_volume BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated DATETIME,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_symbol (symbol),
    INDEX idx_sector (sector),
    INDEX idx_exchange (exchange)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alert Configurations
CREATE TABLE IF NOT EXISTS alert_configurations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    conditions JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notification_channels JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alert Settings
CREATE TABLE IF NOT EXISTS alert_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    stock_symbol VARCHAR(20) NOT NULL,
    alert_type ENUM('price_above', 'price_below', 'percent_change', 'volume') NOT NULL,
    price_above DECIMAL(15,4),
    price_below DECIMAL(15,4),
    percent_change DECIMAL(5,2),
    volume_threshold BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    notification_email BOOLEAN DEFAULT TRUE,
    notification_push BOOLEAN DEFAULT TRUE,
    notification_sms BOOLEAN DEFAULT FALSE,
    last_triggered_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_stock_symbol (stock_symbol),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Watchlists
CREATE TABLE IF NOT EXISTS watchlists (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    stocks JSON,
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Portfolios
CREATE TABLE IF NOT EXISTS portfolios (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    total_value DECIMAL(15,2) DEFAULT 0,
    total_invested DECIMAL(15,2) DEFAULT 0,
    total_profit_loss DECIMAL(15,2) DEFAULT 0,
    profit_loss_percent DECIMAL(8,2) DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Portfolio Holdings
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    portfolio_id CHAR(36) NOT NULL,
    stock_symbol VARCHAR(20) NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    cost_basis DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2),
    avg_buy_price DECIMAL(15,4),
    profit_loss DECIMAL(15,2),
    profit_loss_percent DECIMAL(8,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_portfolio_stock (portfolio_id, stock_symbol),
    INDEX idx_stock_symbol (stock_symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    event_type VARCHAR(100) NOT NULL,
    event_data JSON,
    user_id CHAR(36),
    session_id VARCHAR(100),
    page_url VARCHAR(500),
    referrer VARCHAR(500),
    device_info JSON,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_event_type (event_type),
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reports
CREATE TABLE IF NOT EXISTS reports (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    params JSON,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    result_url VARCHAR(500),
    completed_at DATETIME,
    file_size INT,
    format VARCHAR(20) DEFAULT 'pdf',
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id CHAR(36),
    old_data JSON,
    new_data JSON,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_entity_type (entity_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Module Approval Requests
CREATE TABLE IF NOT EXISTS module_approval_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    module_name VARCHAR(100) NOT NULL,
    requested_by CHAR(36) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by CHAR(36),
    approved_at DATETIME,
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id CHAR(36) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    is_verified BOOLEAN DEFAULT FALSE,
    helpful_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_entity_review (user_id, entity_type, entity_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
