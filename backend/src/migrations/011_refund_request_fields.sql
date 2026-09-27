-- Migration: 011_refund_request_fields.sql
-- Description: Restore the full refund_requests schema.
--   AllModels.js defined RefundRequest twice; the second, stripped-down copy
--   silently overrode the first, so these columns were never created even
--   though the frontend reads and writes them.
-- MySQL has no "ADD COLUMN IF NOT EXISTS"; re-running a statement whose column
-- already exists fails harmlessly with ER_DUP_FIELDNAME (1060).

ALTER TABLE refund_requests ADD COLUMN subscription_id    CHAR(36) NULL;
ALTER TABLE refund_requests ADD COLUMN transaction_id     VARCHAR(255) NULL;
ALTER TABLE refund_requests ADD COLUMN transaction_type   VARCHAR(255) NULL DEFAULT 'subscription';
ALTER TABLE refund_requests ADD COLUMN razorpay_refund_id VARCHAR(255) NULL;
ALTER TABLE refund_requests ADD COLUMN refund_amount      DECIMAL(10,2) NULL;
ALTER TABLE refund_requests ADD COLUMN admin_notes        TEXT NULL;

-- Carry existing values onto the columns the application actually reads.
UPDATE refund_requests SET refund_amount = amount WHERE refund_amount IS NULL AND amount IS NOT NULL;
UPDATE refund_requests SET transaction_type = CASE WHEN ticket_id IS NOT NULL THEN 'event_ticket' ELSE 'subscription' END WHERE transaction_type IS NULL;
