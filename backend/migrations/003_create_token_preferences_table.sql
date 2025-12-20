-- Migration: 003_create_token_preferences_table
-- Description: Create token_preferences table for preferred chains per token

CREATE TABLE token_preferences (
  id                SERIAL PRIMARY KEY,
  user_id           UUID NOT NULL,
  token_symbol      VARCHAR(16) NOT NULL,
  preferred_chain_id VARCHAR(32) NOT NULL,
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign Keys
  CONSTRAINT fk_token_preferences_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
  
  -- Constraints
  CONSTRAINT token_preferences_unique_user_token 
    UNIQUE (user_id, token_symbol),
  CONSTRAINT token_preferences_token_symbol_valid 
    CHECK (LENGTH(TRIM(token_symbol)) > 0 AND token_symbol = UPPER(token_symbol)),
  CONSTRAINT token_preferences_chain_id_valid 
    CHECK (preferred_chain_id IN ('ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche', 'solana'))
);

-- Indexes
CREATE INDEX idx_token_preferences_user_id ON token_preferences(user_id);
CREATE INDEX idx_token_preferences_token_symbol ON token_preferences(token_symbol);

-- Trigger for updated_at
CREATE TRIGGER token_preferences_updated_at
  BEFORE UPDATE ON token_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE token_preferences IS 'User preferences for receiving tokens on specific chains';
COMMENT ON COLUMN token_preferences.token_symbol IS 'Token symbol (e.g., USDT, USDC, ETH)';
COMMENT ON COLUMN token_preferences.preferred_chain_id IS 'Preferred chain for receiving this token';
