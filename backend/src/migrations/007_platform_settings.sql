-- Migration 007: Platform Settings, Notifications and Content
-- Depends on: 001_users_auth.sql

-- Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `key` VARCHAR(255) NOT NULL UNIQUE,
    value TEXT,
    category VARCHAR(100),
    updated_by CHAR(36),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_key (`key`),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Entity Configs
CREATE TABLE IF NOT EXISTS entity_configs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    entity_type VARCHAR(100) NOT NULL,
    config JSON NOT NULL,
    updated_by CHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_entity_type (entity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    data JSON,
    action_url VARCHAR(500),
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_type (type),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification Settings
CREATE TABLE IF NOT EXISTS notification_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    preferences JSON,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_settings (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- News
CREATE TABLE IF NOT EXISTS news (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(500) NOT NULL,
    content TEXT,
    summary TEXT,
    category VARCHAR(100),
    stock_symbols VARCHAR(255),
    tags VARCHAR(500),
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    published_at DATETIME,
    author_id CHAR(36),
    image_url VARCHAR(500),
    source VARCHAR(255),
    source_url VARCHAR(500),
    views_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    sentiment ENUM('positive', 'negative', 'neutral') DEFAULT 'neutral',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_published_at (published_at),
    INDEX idx_is_featured (is_featured),
    FULLTEXT idx_search (title, content, summary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Static Pages
CREATE TABLE IF NOT EXISTS static_pages (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    meta_title VARCHAR(255),
    meta_description TEXT,
    status ENUM('draft', 'published') DEFAULT 'draft',
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Localizations
CREATE TABLE IF NOT EXISTS localizations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `key` VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    value TEXT NOT NULL,
    category VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_key_lang (`key`, language),
    INDEX idx_language (language),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50),
    variables JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email Logs
CREATE TABLE IF NOT EXISTS email_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    template_id CHAR(36),
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    body TEXT,
    status ENUM('pending', 'sent', 'failed', 'bounced') DEFAULT 'pending',
    sent_at DATETIME,
    error_message TEXT,
    opened_at DATETIME,
    clicked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
    INDEX idx_to_email (to_email),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default platform settings
INSERT INTO platform_settings (id, `key`, value, category, description) VALUES
(UUID(), 'site_name', 'Stock Trading Platform', 'general', 'Platform name'),
(UUID(), 'site_description', 'Connect with traders and advisors', 'general', 'Platform description'),
(UUID(), 'maintenance_mode', 'false', 'system', 'Enable maintenance mode'),
(UUID(), 'registration_enabled', 'true', 'auth', 'Allow new user registrations'),
(UUID(), 'email_verification_required', 'false', 'auth', 'Require email verification'),
(UUID(), 'default_trust_score', '50', 'users', 'Default trust score for new users'),
(UUID(), 'min_pledge_amount', '1000', 'pledges', 'Minimum pledge amount'),
(UUID(), 'commission_rate', '5', 'pledges', 'Default commission rate percentage');

-- Insert default email templates
INSERT INTO email_templates (id, name, subject, body, type, variables, is_active) VALUES
(UUID(), 'welcome', 'Welcome to {{site_name}}!', 'Hello {{user_name}},\n\nWelcome to {{site_name}}!\n\nThank you for joining our community.', 'transactional', '["site_name", "user_name"]', TRUE),
(UUID(), 'password_reset', 'Reset Your Password', 'Hello {{user_name}},\n\nClick the link below to reset your password:\n{{reset_link}}\n\nThis link expires in 24 hours.', 'transactional', '["user_name", "reset_link"]', TRUE),
(UUID(), 'pledge_confirmation', 'Pledge Confirmed', 'Hello {{user_name}},\n\nYour pledge of ₹{{amount}} has been confirmed.\n\nStock: {{stock_symbol}}', 'transactional', '["user_name", "amount", "stock_symbol"]', TRUE);
