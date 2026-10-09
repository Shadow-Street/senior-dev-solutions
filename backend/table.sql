-- ===========================================================================
--  table.sql — schema changes that sequelize.sync() will NOT apply
-- ===========================================================================
--
--  WHY THIS FILE EXISTS
--  --------------------
--  server.js runs `sequelize.sync()` (no { alter: true }). That CREATES tables
--  which do not exist yet, but it NEVER adds, changes or drops a column on a
--  table that already exists. So:
--
--    * New model in AllModels.js  -> created automatically on next boot.
--    * New column on an EXISTING  -> NOT created. It must be added here.
--      model
--
--  Symptom of a forgotten column: the API returns
--      { "error": "Unknown column 'x.y' in 'where clause'" }
--  or the field silently reads back as undefined in the UI.
--
--  HOW TO USE
--  ----------
--  1. Append new statements to the bottom, under a dated heading.
--  2. Never edit or delete an existing block — append only, so the file can be
--     replayed from scratch on a fresh database.
--  3. Apply with:  mysql -u <user> -p <database> < backend/table.sql
--     (or paste the new block into your SQL client)
--
--  RE-RUNNING
--  ----------
--  MySQL has no "ADD COLUMN IF NOT EXISTS". Re-running an ALTER whose column
--  already exists fails with ER_DUP_FIELDNAME (1060) and is safe to ignore.
--  CREATE TABLE statements below are all guarded with IF NOT EXISTS.
--
--  Engine/charset follow the existing schema: InnoDB / utf8mb4.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 2026-09-27 — Restore the full refund_requests schema
--
-- AllModels.js defined RefundRequest TWICE; the second, stripped-down copy
-- silently overrode the first, so these columns were never created even though
-- the frontend reads and writes them. The duplicate has been removed.
-- ---------------------------------------------------------------------------
ALTER TABLE refund_requests ADD COLUMN subscription_id    CHAR(36)      NULL;
ALTER TABLE refund_requests ADD COLUMN transaction_id     VARCHAR(255)  NULL;
ALTER TABLE refund_requests ADD COLUMN transaction_type   VARCHAR(255)  NULL DEFAULT 'subscription';
ALTER TABLE refund_requests ADD COLUMN razorpay_refund_id VARCHAR(255)  NULL;
ALTER TABLE refund_requests ADD COLUMN refund_amount      DECIMAL(10,2) NULL;
ALTER TABLE refund_requests ADD COLUMN admin_notes        TEXT          NULL;

-- Backfill so existing rows carry values on the columns the app actually reads.
UPDATE refund_requests
   SET refund_amount = amount
 WHERE refund_amount IS NULL
   AND amount IS NOT NULL;

UPDATE refund_requests
   SET transaction_type = CASE WHEN ticket_id IS NOT NULL THEN 'event_ticket'
                               ELSE 'subscription' END
 WHERE transaction_type IS NULL;


-- ---------------------------------------------------------------------------
-- 2026-09-27 — Tables backing admin screens that previously returned 404
--
-- These are created automatically by sequelize.sync() on a fresh boot. They are
-- reproduced here so the schema can also be built directly from SQL.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS role_templates (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  name            VARCHAR(255) NULL,
  description     TEXT         NULL,
  is_active       TINYINT(1)   NULL DEFAULT 1,
  user_count      INT          NULL DEFAULT 0,
  created_by      CHAR(36)     NULL,
  created_by_name VARCHAR(255) NULL,
  created_at      DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_template_permissions (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  template_id   CHAR(36) NULL,
  permission_id CHAR(36) NULL,
  created_at    DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rtp_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS alert_logs (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  alert_type   VARCHAR(255) NULL,
  severity     VARCHAR(255) NULL DEFAULT 'info',     -- info | warning | critical
  message      TEXT         NULL,
  status       VARCHAR(255) NULL DEFAULT 'open',     -- open | acknowledged | resolved
  entity_type  VARCHAR(255) NULL,
  entity_id    CHAR(36)     NULL,
  triggered_at DATETIME     NULL,
  resolved_at  DATETIME     NULL,
  resolved_by  CHAR(36)     NULL,
  metadata     JSON         NULL,
  created_at   DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alert_logs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS announcements (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  title      VARCHAR(255) NULL,
  message    TEXT         NULL,
  type       VARCHAR(255) NULL DEFAULT 'info',        -- info | warning | success
  priority   VARCHAR(255) NULL DEFAULT 'normal',
  target     VARCHAR(255) NULL DEFAULT 'all',         -- all | premium | advisors
  is_active  TINYINT(1)   NULL DEFAULT 1,
  starts_at  DATETIME     NULL,
  ends_at    DATETIME     NULL,
  created_by CHAR(36)     NULL,
  created_at DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_announcements_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expenses (
  id           CHAR(36)      NOT NULL PRIMARY KEY,
  category     VARCHAR(255)  NULL,
  description  TEXT          NULL,
  amount       DECIMAL(15,2) NULL,
  currency     VARCHAR(255)  NULL DEFAULT 'INR',
  vendor       VARCHAR(255)  NULL,
  status       VARCHAR(255)  NULL DEFAULT 'recorded',
  expense_date DATETIME      NULL,
  recorded_by  CHAR(36)      NULL,
  created_at   DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS income (
  id          CHAR(36)      NOT NULL PRIMARY KEY,
  source      VARCHAR(255)  NULL,
  description TEXT          NULL,
  amount      DECIMAL(15,2) NULL,
  currency    VARCHAR(255)  NULL DEFAULT 'INR',
  status      VARCHAR(255)  NULL DEFAULT 'recorded',
  income_date DATETIME      NULL,
  recorded_by CHAR(36)      NULL,
  created_at  DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS financial_audit_logs (
  id          CHAR(36)      NOT NULL PRIMARY KEY,
  admin_id    CHAR(36)      NULL,
  admin_name  VARCHAR(255)  NULL,
  action      VARCHAR(255)  NULL,
  entity_type VARCHAR(255)  NULL,
  entity_id   CHAR(36)      NULL,
  amount      DECIMAL(15,2) NULL,
  details     JSON          NULL,
  created_at  DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fin_audit_admin (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS commission_settings (
  id                 CHAR(36)      NOT NULL PRIMARY KEY,
  entity_type        VARCHAR(255)  NULL,             -- advisor | finfluencer | organizer
  commission_percent DECIMAL(5,2)  NULL,
  flat_fee           DECIMAL(15,2) NULL,
  currency           VARCHAR(255)  NULL DEFAULT 'INR',
  is_active          TINYINT(1)    NULL DEFAULT 1,
  updated_by         CHAR(36)      NULL,
  created_at         DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ---------------------------------------------------------------------------
-- 2026-09-27 — Finnhub integration: persist the article link
--
-- News articles are now sourced from Finnhub's /news endpoint, which returns a
-- canonical `url` per article. The news table predates this, so the column must
-- be added by hand (sequelize.sync() will not alter an existing table).
-- ---------------------------------------------------------------------------
ALTER TABLE news ADD COLUMN url VARCHAR(255) NULL;


-- ---------------------------------------------------------------------------
-- 2026-09-27 — Finnhub integration: persist the day's price move
--
-- The stocks table cached current_price but had nowhere to store the change,
-- so every cache-served quote read back as 0.00% for up to 15 minutes.
-- ---------------------------------------------------------------------------
ALTER TABLE stocks ADD COLUMN `change`       DECIMAL(15,4) NULL;
ALTER TABLE stocks ADD COLUMN change_percent DECIMAL(10,4) NULL;


-- ---------------------------------------------------------------------------
-- 2026-10-04 — Advisor module: align the schema with the UI contract
--
-- The frontend reads advisor.display_name in 28 places (and advisor.name in
-- none), plus SEBI registration fields that drive the admin approval queue.
-- None of those columns existed, so advisor names rendered blank in the admin
-- panel. `name` is kept so existing rows do not lose data.
-- ---------------------------------------------------------------------------
ALTER TABLE advisors ADD COLUMN display_name             VARCHAR(255)  NULL;
ALTER TABLE advisors ADD COLUMN profile_image_url        VARCHAR(255)  NULL;
ALTER TABLE advisors ADD COLUMN sebi_registration_number VARCHAR(255)  NULL;
ALTER TABLE advisors ADD COLUMN sebi_document_url        VARCHAR(255)  NULL;
ALTER TABLE advisors ADD COLUMN rejection_reason         TEXT          NULL;
ALTER TABLE advisors ADD COLUMN follower_count           INT           NULL DEFAULT 0;
ALTER TABLE advisors ADD COLUMN success_rate             DECIMAL(5,2)  NULL;

-- Carry existing names onto the column the application actually reads.
UPDATE advisors SET display_name = name WHERE display_name IS NULL AND name IS NOT NULL;
UPDATE advisors SET profile_image_url = avatar_url WHERE profile_image_url IS NULL AND avatar_url IS NOT NULL;


-- ===========================================================================
--  APPEND NEW CHANGES BELOW THIS LINE
--
--  Template:
--
--  -- -------------------------------------------------------------------
--  -- YYYY-MM-DD — <short reason>
--  -- -------------------------------------------------------------------
--  ALTER TABLE <table> ADD COLUMN <column> <type> NULL;
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- users.display_name
-- ---------------------------------------------------------------------------
-- The frontend reads `display_name` on the user in 334 places and the Profile
-- screen saves it via User.updateMyUserData({ display_name }). The column did
-- not exist, so the save was accepted and silently discarded and every read
-- rendered empty. Backfilled from `name` so existing accounts show a name
-- immediately. Safe to re-run.
-- MySQL 8 has no ADD COLUMN IF NOT EXISTS, so this matches the plain style
-- used above: it errors harmlessly with 1060 (duplicate column) on a re-run.
ALTER TABLE users ADD COLUMN display_name VARCHAR(100) NULL AFTER name;

-- Backfill so existing accounts show a name immediately.
UPDATE users
   SET display_name = name
 WHERE display_name IS NULL OR display_name = '';

-- ---------------------------------------------------------------------------
-- educators
-- ---------------------------------------------------------------------------
-- The /Educators page reads an Educator entity that had neither a model nor a
-- table, so every load fell back to fabricated instructors. sequelize.sync()
-- creates this table on boot, but it is written out here too so a managed
-- database can be migrated without relying on sync.
CREATE TABLE IF NOT EXISTS educators (
  id                 CHAR(36)      NOT NULL PRIMARY KEY,
  user_id            CHAR(36)      NULL,
  display_name       VARCHAR(255)  NULL,
  bio                TEXT          NULL,
  profile_image_url  VARCHAR(255)  NULL,
  specialization     JSON          NULL,
  certification      JSON          NULL,
  social_links       JSON          NULL,
  course_price_range JSON          NULL,
  teaching_style     VARCHAR(255)  NULL,
  experience_years   INT           NULL,
  student_count      INT           NULL DEFAULT 0,
  success_rate       DECIMAL(5,2)  NULL,
  rating             DECIMAL(3,2)  NULL,
  verified           TINYINT(1)    NULL DEFAULT 0,
  status             VARCHAR(255)  NULL,
  rejection_reason   TEXT          NULL,
  created_at         DATETIME      NULL,
  updated_at         DATETIME      NULL,
  INDEX educators_user_id_idx (user_id),
  INDEX educators_status_idx (status)
);

-- ---------------------------------------------------------------------------
-- oauth_tokens — refresh token rotation
-- ---------------------------------------------------------------------------
-- Refresh tokens were stored as the raw JWT, so this table was itself a set of
-- live credentials, and there was no way to revoke or rotate one. Only a
-- SHA-256 hash is stored now, and rotation is tracked so that presenting an
-- already-rotated token can be recognised as theft.
ALTER TABLE oauth_tokens ADD COLUMN token_hash       VARCHAR(64) NULL AFTER user_id;
ALTER TABLE oauth_tokens ADD COLUMN revoked_at       DATETIME    NULL;
ALTER TABLE oauth_tokens ADD COLUMN replaced_by_hash VARCHAR(64) NULL;
ALTER TABLE oauth_tokens ADD COLUMN user_agent       VARCHAR(255) NULL;
ALTER TABLE oauth_tokens ADD COLUMN ip_address       VARCHAR(64)  NULL;
ALTER TABLE oauth_tokens MODIFY COLUMN refresh_token TEXT NULL;
CREATE INDEX oauth_tokens_token_hash_idx ON oauth_tokens (token_hash);
CREATE INDEX oauth_tokens_user_id_idx    ON oauth_tokens (user_id);

-- Rows holding raw tokens predate hashing and can never be matched again.
DELETE FROM oauth_tokens WHERE token_hash IS NULL;

-- ---------------------------------------------------------------------------
-- Workflow status defaults — pending on creation
-- ---------------------------------------------------------------------------
-- These five tables back approval workflows: a user files a request, staff
-- decide it. `status` is therefore a staff-only field, stripped from any
-- client payload, which left new rows with status NULL — and the approver
-- screens filter on 'pending', so a freshly filed withdrawal was invisible to
-- the person meant to approve it. The initial state belongs in the column
-- default, not in the client's request.
ALTER TABLE fund_withdrawal_requests        MODIFY COLUMN status VARCHAR(255) NULL DEFAULT 'pending';
ALTER TABLE fund_payout_requests            MODIFY COLUMN status VARCHAR(255) NULL DEFAULT 'pending';
ALTER TABLE fund_invoices                   MODIFY COLUMN status VARCHAR(255) NULL DEFAULT 'pending';
ALTER TABLE pledge_payments                 MODIFY COLUMN status VARCHAR(255) NULL DEFAULT 'pending';
ALTER TABLE advisor_pledge_access_requests  MODIFY COLUMN status VARCHAR(255) NULL DEFAULT 'pending';

-- Existing rows created before the default was in place.
UPDATE fund_withdrawal_requests        SET status = 'pending' WHERE status IS NULL;
UPDATE fund_payout_requests            SET status = 'pending' WHERE status IS NULL;
UPDATE fund_invoices                   SET status = 'pending' WHERE status IS NULL;
UPDATE pledge_payments                 SET status = 'pending' WHERE status IS NULL;
UPDATE advisor_pledge_access_requests  SET status = 'pending' WHERE status IS NULL;

-- ---------------------------------------------------------------------------
-- investment_allocations — one investor's capital in one fund plan
-- ---------------------------------------------------------------------------
-- The superadmin's ExecuteAllocationModal has always POSTed this shape, but no
-- model, table or route existed behind it, so executing an allocation failed
-- at the first step and the four follow-up writes chained off its id never
-- ran. Distinct from fund_allocations, which splits a fund across stocks by
-- percentage.
CREATE TABLE IF NOT EXISTS investment_allocations (
  id                     CHAR(36)       NOT NULL PRIMARY KEY,
  investor_id            CHAR(36)       NULL,
  fund_plan_id           CHAR(36)       NULL,
  investment_request_id  CHAR(36)       NULL,
  allocation_amount      DECIMAL(15,2)  NULL,
  allocation_date        DATETIME       NULL,
  nav_at_allocation      DECIMAL(15,4)  NULL,
  units_allocated        DECIMAL(15,4)  NULL,
  current_value          DECIMAL(15,2)  NULL,
  profit_earned          DECIMAL(15,2)  NULL DEFAULT 0,
  days_held              INT            NULL DEFAULT 0,
  status                 VARCHAR(255)   NULL DEFAULT 'active',
  created_at             DATETIME       NULL,
  updated_at             DATETIME       NULL,
  INDEX investment_allocations_investor_id_idx (investor_id),
  INDEX investment_allocations_fund_plan_id_idx (fund_plan_id)
);

-- ---------------------------------------------------------------------------
-- Application status defaults — advisors, portfolio managers, finfluencers
-- ---------------------------------------------------------------------------
-- All three are application records: a user applies, staff approve. `status` is
-- a staff-only field, so the value the registration form sends is stripped —
-- correctly, since an applicant must not submit themselves as 'approved'. But
-- nothing then supplied one, so rows landed with NULL and the registration page
-- crashed reading `.status.replace()` right after a successful submission.
ALTER TABLE advisors           MODIFY COLUMN status VARCHAR(255) NULL DEFAULT 'pending_approval';
ALTER TABLE portfolio_managers MODIFY COLUMN status VARCHAR(255) NULL DEFAULT 'pending_approval';
ALTER TABLE finfluencers       MODIFY COLUMN status VARCHAR(255) NULL DEFAULT 'pending_approval';

UPDATE advisors           SET status = 'pending_approval' WHERE status IS NULL;
UPDATE portfolio_managers SET status = 'pending_approval' WHERE status IS NULL;
UPDATE finfluencers       SET status = 'pending_approval' WHERE status IS NULL;

-- ---------------------------------------------------------------------------
-- room_subscriptions — paid access to a single premium chat room
-- ---------------------------------------------------------------------------
-- Distinct from the platform-wide `subscriptions` table. RoomAccessControl
-- already checks for an active row here before granting entry to a paid room,
-- and two superadmin panels list them, but no model or table existed — so
-- /api/chatrooms/subscriptions returned 404 and the Premium and Access panels
-- in Chat Room Management came up empty.
CREATE TABLE IF NOT EXISTS room_subscriptions (
  id                CHAR(36)      NOT NULL PRIMARY KEY,
  user_id           CHAR(36)      NULL,
  room_id           CHAR(36)      NULL,
  status            VARCHAR(255)  NULL DEFAULT 'active',
  start_date        DATETIME      NULL,
  expires_at        DATETIME      NULL,
  amount_paid       DECIMAL(15,2) NULL,
  payment_reference VARCHAR(255)  NULL,
  created_at        DATETIME      NULL,
  updated_at        DATETIME      NULL,
  INDEX room_subscriptions_user_id_idx (user_id),
  INDEX room_subscriptions_room_id_idx (room_id),
  INDEX room_subscriptions_status_idx  (status)
);
