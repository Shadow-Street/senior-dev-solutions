-- Migration 003: Pledges and Fund Management
-- Depends on: 001_users_auth.sql

-- Pledge Sessions
CREATE TABLE IF NOT EXISTS pledge_sessions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    advisor_id CHAR(36),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stock_symbol VARCHAR(20),
    target_amount DECIMAL(15,2),
    current_amount DECIMAL(15,2) DEFAULT 0,
    status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'draft',
    start_date DATETIME,
    end_date DATETIME,
    min_pledge DECIMAL(15,2) DEFAULT 1000,
    max_pledge DECIMAL(15,2),
    commission_rate DECIMAL(5,2) DEFAULT 5.00,
    participant_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (advisor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_advisor_id (advisor_id),
    INDEX idx_status (status),
    INDEX idx_stock_symbol (stock_symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pledges
CREATE TABLE IF NOT EXISTS pledges (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    session_id CHAR(36),
    user_id CHAR(36) NOT NULL,
    advisor_id CHAR(36),
    stock_symbol VARCHAR(20),
    amount DECIMAL(15,2) NOT NULL,
    quantity DECIMAL(15,4),
    status ENUM('pending', 'confirmed', 'executed', 'cancelled', 'expired') DEFAULT 'pending',
    pledge_type ENUM('buy', 'sell') DEFAULT 'buy',
    target_price DECIMAL(15,4),
    executed_price DECIMAL(15,4),
    executed_at DATETIME,
    expires_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES pledge_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (advisor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pledge Execution Records
CREATE TABLE IF NOT EXISTS pledge_executions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    pledge_id CHAR(36) NOT NULL,
    executed_quantity DECIMAL(15,4),
    executed_price DECIMAL(15,4),
    execution_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    broker_order_id VARCHAR(100),
    status ENUM('pending', 'partial', 'complete', 'failed') DEFAULT 'pending',
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pledge_id) REFERENCES pledges(id) ON DELETE CASCADE,
    INDEX idx_pledge_id (pledge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pledge Access Requests
CREATE TABLE IF NOT EXISTS pledge_access_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    session_id CHAR(36),
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    response_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES pledge_sessions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Advisor Pledge Access Requests
CREATE TABLE IF NOT EXISTS advisor_pledge_access_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    advisor_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    pledge_id CHAR(36),
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (advisor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pledge_id) REFERENCES pledges(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pledge Audit Logs
CREATE TABLE IF NOT EXISTS pledge_audit_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    pledge_id CHAR(36),
    user_id CHAR(36),
    action VARCHAR(100) NOT NULL,
    details JSON,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pledge_id) REFERENCES pledges(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_pledge_id (pledge_id),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pledge Payments
CREATE TABLE IF NOT EXISTS pledge_payments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    pledge_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    gateway_response JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pledge_id) REFERENCES pledges(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fund Plans
CREATE TABLE IF NOT EXISTS fund_plans (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_return DECIMAL(5,2),
    risk_level ENUM('low', 'medium', 'high', 'very_high') DEFAULT 'medium',
    min_investment DECIMAL(15,2) DEFAULT 10000,
    max_investment DECIMAL(15,2),
    status ENUM('active', 'inactive', 'closed') DEFAULT 'active',
    duration_months INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_risk_level (risk_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fund Allocations
CREATE TABLE IF NOT EXISTS fund_allocations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    fund_id CHAR(36),
    stock_symbol VARCHAR(20) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    allocation_type VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (fund_id) REFERENCES fund_plans(id) ON DELETE CASCADE,
    INDEX idx_stock_symbol (stock_symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fund Wallets
CREATE TABLE IF NOT EXISTS fund_wallets (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0,
    locked_balance DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'INR',
    status ENUM('active', 'frozen', 'closed') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_wallet (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fund Transactions
CREATE TABLE IF NOT EXISTS fund_transactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    wallet_id CHAR(36),
    user_id CHAR(36) NOT NULL,
    type ENUM('deposit', 'withdrawal', 'investment', 'return', 'fee', 'refund') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2),
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    reference_id CHAR(36),
    reference_type VARCHAR(50),
    description TEXT,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES fund_wallets(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fund Notifications
CREATE TABLE IF NOT EXISTS fund_notifications (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    fund_id CHAR(36),
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (fund_id) REFERENCES fund_plans(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fund Withdrawal Requests
CREATE TABLE IF NOT EXISTS fund_withdrawal_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    wallet_id CHAR(36),
    amount DECIMAL(15,2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    bank_details JSON,
    processed_at DATETIME,
    processed_by CHAR(36),
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (wallet_id) REFERENCES fund_wallets(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fund Payout Requests
CREATE TABLE IF NOT EXISTS fund_payout_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    payout_method VARCHAR(50),
    payout_details JSON,
    processed_at DATETIME,
    reference_number VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fund Invoices
CREATE TABLE IF NOT EXISTS fund_invoices (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
    invoice_number VARCHAR(50) UNIQUE,
    due_date DATE,
    paid_at DATETIME,
    items JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
