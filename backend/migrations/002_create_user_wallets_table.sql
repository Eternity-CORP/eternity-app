-- Migration: 002_create_user_wallets_table
-- Description: Create user_wallets table for multi-chain addresses

CREATE TABLE user_wallets (
  id                SERIAL PRIMARY KEY,
  user_id           UUID NOT NULL,
  chain_id          VARCHAR(32) NOT NULL,
  address           VARCHAR(128) NOT NULL,
  is_primary        BOOLEAN NOT NULL DEFAULT FALSE,
  label             VARCHAR(64),
  added_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign Keys
  CONSTRAINT fk_user_wallets_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
  
  -- Constraints
  CONSTRAINT user_wallets_unique_address 
    UNIQUE (user_id, chain_id, address),
  CONSTRAINT user_wallets_one_primary_per_chain 
    UNIQUE (user_id, chain_id, is_primary) 
    WHERE is_primary = TRUE,
  CONSTRAINT user_wallets_chain_id_valid 
    CHECK (chain_id IN ('ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche', 'solana', 'bitcoin')),
  CONSTRAINT user_wallets_address_not_empty 
    CHECK (LENGTH(TRIM(address)) > 0)
);

-- Indexes
CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX idx_user_wallets_address ON user_wallets(address);
CREATE INDEX idx_user_wallets_chain_id ON user_wallets(chain_id);
CREATE INDEX idx_user_wallets_primary ON user_wallets(user_id, chain_id) WHERE is_primary = TRUE;

-- Comments
COMMENT ON TABLE user_wallets IS 'User wallet addresses across different blockchains';
COMMENT ON COLUMN user_wallets.is_primary IS 'Primary wallet for this chain (only one per user per chain)';
COMMENT ON COLUMN user_wallets.chain_id IS 'Blockchain identifier (ethereum, polygon, etc.)';
