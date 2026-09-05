-- Migration 010: Update Subscription Plans Pricing
-- Add price_monthly, price_annually, and is_system_plan fields

-- Add new pricing fields to subscription_plans
ALTER TABLE subscription_plans 
  ADD COLUMN price_monthly DECIMAL(10,2) DEFAULT 0 AFTER price,
  ADD COLUMN price_annually DECIMAL(10,2) DEFAULT 0 AFTER price_monthly,
  ADD COLUMN is_system_plan BOOLEAN DEFAULT FALSE AFTER is_active;

-- Migrate existing data: copy price to price_monthly
UPDATE subscription_plans 
SET price_monthly = price, 
    price_annually = price * 12 * 0.84  -- 16% discount for annual
WHERE price_monthly IS NULL OR price_monthly = 0;

-- Mark default plans as system plans (cannot be deleted)
UPDATE subscription_plans 
SET is_system_plan = TRUE 
WHERE name IN ('Free', 'Premium', 'VIP');

-- Add index for system plans
CREATE INDEX idx_is_system_plan ON subscription_plans(is_system_plan);
