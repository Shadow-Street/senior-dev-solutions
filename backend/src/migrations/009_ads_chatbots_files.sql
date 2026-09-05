-- Migration 009: Ads, Chatbots, Files and Remaining Tables
-- Depends on: 001_users_auth.sql

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    address TEXT,
    logo_url VARCHAR(500),
    verified BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ad Campaigns
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    advertiser_id CHAR(36),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    budget DECIMAL(15,2) NOT NULL,
    spent DECIMAL(15,2) DEFAULT 0,
    status ENUM('draft', 'active', 'paused', 'completed', 'cancelled') DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    priority INT DEFAULT 0,
    target_audience JSON,
    creative_urls JSON,
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    conversions INT DEFAULT 0,
    ctr DECIMAL(5,4) DEFAULT 0,
    placement VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (advertiser_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_start_date (start_date),
    INDEX idx_placement (placement)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ad Transactions
CREATE TABLE IF NOT EXISTS ad_transactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    campaign_id CHAR(36) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type ENUM('charge', 'refund', 'credit', 'debit') NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    INDEX idx_campaign_id (campaign_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Campaign Billing
CREATE TABLE IF NOT EXISTS campaign_billing (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    campaign_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
    invoice_number VARCHAR(50),
    due_date DATE,
    paid_at DATETIME,
    payment_method VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat Bots
CREATE TABLE IF NOT EXISTS chat_bots (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    type ENUM('support', 'trading', 'general', 'custom') DEFAULT 'general',
    description TEXT,
    status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
    config JSON,
    avatar_url VARCHAR(500),
    welcome_message TEXT,
    fallback_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bot Conversations
CREATE TABLE IF NOT EXISTS bot_conversations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    bot_id CHAR(36) NOT NULL,
    user_id CHAR(36),
    session_id VARCHAR(100) NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    message TEXT NOT NULL,
    context JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES chat_bots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Files
CREATE TABLE IF NOT EXISTS files (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    mime_type VARCHAR(100),
    size INT,
    path VARCHAR(500) NOT NULL,
    url VARCHAR(500),
    entity_type VARCHAR(50),
    entity_id CHAR(36),
    is_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Moderation Logs
CREATE TABLE IF NOT EXISTS moderation_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    moderator_id CHAR(36),
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id CHAR(36),
    reason TEXT,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    status ENUM('pending', 'resolved', 'escalated') DEFAULT 'pending',
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_action (action),
    INDEX idx_target_type (target_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contact Inquiries
CREATE TABLE IF NOT EXISTS contact_inquiries (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status ENUM('new', 'in_progress', 'resolved', 'closed') DEFAULT 'new',
    assigned_to CHAR(36),
    resolved_at DATETIME,
    response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    type ENUM('bug', 'feature', 'improvement', 'complaint', 'praise', 'other') DEFAULT 'other',
    category VARCHAR(100),
    content TEXT NOT NULL,
    status ENUM('new', 'reviewed', 'in_progress', 'implemented', 'rejected') DEFAULT 'new',
    rating INT CHECK (rating >= 1 AND rating <= 5),
    response TEXT,
    responded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_type (type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default chatbot
INSERT INTO chat_bots (id, name, type, description, status, welcome_message, fallback_message) VALUES
(UUID(), 'Trading Assistant', 'trading', 'AI-powered trading assistant', 'active', 
 'Hello! I am your Trading Assistant. How can I help you today?', 
 'I apologize, but I did not understand that. Could you please rephrase your question?');
