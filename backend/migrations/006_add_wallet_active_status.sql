-- Migration: 006_add_wallet_active_status
-- Description: Add isActive field to user_wallets for network enable/disable functionality
-- Date: 2025-12-21

-- Add is_active column with default TRUE for backward compatibility
ALTER TABLE user_wallets
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Create partial index for active wallets (optimizes queries filtering by isActive=true)
CREATE INDEX idx_user_wallets_active ON user_wallets(user_id, is_active) WHERE is_active = TRUE;

-- Add column comment for documentation
COMMENT ON COLUMN user_wallets.is_active IS 'Whether this network is active/enabled for the user. At least one active wallet must exist per user (enforced at application level).';

-- Verify migration
SELECT
  COUNT(*) as total_wallets,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_wallets,
  SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END) as inactive_wallets
FROM user_wallets;
