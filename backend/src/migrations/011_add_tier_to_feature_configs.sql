-- Migration: Add tier column to feature_configs table

ALTER TABLE feature_configs 
  ADD COLUMN tier ENUM('basic', 'premium', 'vip') DEFAULT 'basic' AFTER access_level;

-- Update existing features to have appropriate tiers based on access_level
UPDATE feature_configs 
SET tier = CASE 
  WHEN access_level = 'free' THEN 'basic'
  WHEN access_level = 'premium' THEN 'premium'
  WHEN access_level = 'vip' THEN 'vip'
  ELSE 'basic'
END;
