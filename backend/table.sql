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
