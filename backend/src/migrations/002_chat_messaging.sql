-- Migration 002: Chat Rooms and Messaging
-- Depends on: 001_users_auth.sql

-- Chat Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stock_symbol VARCHAR(20),
    room_type ENUM('general', 'stock_specific', 'sector', 'admin', 'premium', 'premium_admin') DEFAULT 'general',
    is_public BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,
    admin_only_post BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'archived', 'suspended') DEFAULT 'active',
    participant_count INT DEFAULT 0,
    owner_id CHAR(36),
    moderator_ids JSON,
    avatar_url VARCHAR(500),
    last_message_at DATETIME,
    settings JSON,
    created_by VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_room_type (room_type),
    INDEX idx_stock_symbol (stock_symbol),
    INDEX idx_status (status),
    INDEX idx_is_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat Room Participants
CREATE TABLE IF NOT EXISTS chat_room_participants (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    chat_room_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    role ENUM('member', 'moderator', 'admin', 'owner') DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    muted BOOLEAN DEFAULT FALSE,
    last_read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_participant (chat_room_id, user_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    chat_room_id CHAR(36) NOT NULL,
    user_id CHAR(36),
    created_by VARCHAR(255),
    content TEXT,
    message_type ENUM('text', 'image', 'file', 'poll', 'bot_insight', 'system') DEFAULT 'text',
    is_bot BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    pinned_at DATETIME,
    reply_to_id CHAR(36),
    reply_to_message_id CHAR(36),
    reply_to_user_name VARCHAR(255),
    reply_to_content TEXT,
    media_urls JSON,
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at DATETIME,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL,
    INDEX idx_chat_room_id (chat_room_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_date (created_date),
    INDEX idx_is_pinned (is_pinned)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Message Reactions
CREATE TABLE IF NOT EXISTS message_reactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    message_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    emoji VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_reaction (message_id, user_id, emoji)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Message Read Receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    chat_room_id CHAR(36) NOT NULL,
    message_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_read_receipt (message_id, user_id),
    INDEX idx_chat_room_id (chat_room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Typing Indicators
CREATE TABLE IF NOT EXISTS typing_indicators (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    chat_room_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    is_typing BOOLEAN DEFAULT FALSE,
    last_typed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_typing (chat_room_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Meetings
CREATE TABLE IF NOT EXISTS meetings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    chat_room_id CHAR(36),
    stock_symbol VARCHAR(20),
    title VARCHAR(255),
    description TEXT,
    meeting_url VARCHAR(500),
    status ENUM('scheduled', 'active', 'ended', 'cancelled') DEFAULT 'scheduled',
    start_time DATETIME,
    end_time DATETIME,
    participant_count INT DEFAULT 0,
    max_participants INT DEFAULT 100,
    host_id CHAR(36),
    recording_url VARCHAR(500),
    is_meeting_active BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_start_time (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Polls
CREATE TABLE IF NOT EXISTS polls (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    chat_room_id CHAR(36),
    creator_id CHAR(36),
    title VARCHAR(255),
    question TEXT NOT NULL,
    stock_symbol VARCHAR(20),
    poll_type ENUM('general', 'buy_sell_hold', 'rating', 'multiple_choice') DEFAULT 'general',
    options JSON NOT NULL,
    votes JSON,
    total_votes INT DEFAULT 0,
    status ENUM('active', 'closed', 'expired') DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,
    expires_at DATETIME,
    is_anonymous BOOLEAN DEFAULT FALSE,
    allow_multiple BOOLEAN DEFAULT FALSE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_stock_symbol (stock_symbol),
    INDEX idx_status (status),
    INDEX idx_poll_type (poll_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Poll Votes
CREATE TABLE IF NOT EXISTS poll_votes (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    poll_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    option_index INT NOT NULL,
    voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vote (poll_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enable realtime for messages (trigger to update last_message_at)
DELIMITER //
CREATE TRIGGER update_chat_room_last_message
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
    UPDATE chat_rooms SET last_message_at = NEW.created_at WHERE id = NEW.chat_room_id;
END//
DELIMITER ;
