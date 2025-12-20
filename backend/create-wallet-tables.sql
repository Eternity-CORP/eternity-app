-- Create user_wallets table
CREATE TABLE IF NOT EXISTS user_wallets (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  chain_id VARCHAR(32) NOT NULL,
  address VARCHAR(128) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  label VARCHAR(64),
  added_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT user_wallets_unique_address UNIQUE (user_id, chain_id, address),
  CONSTRAINT fk_user_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for user_wallets
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_chain_id ON user_wallets(chain_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(address);
CREATE INDEX IF NOT EXISTS idx_user_wallets_primary ON user_wallets(is_primary) WHERE is_primary = TRUE;

-- Create token_preferences table
CREATE TABLE IF NOT EXISTS token_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  token_symbol VARCHAR(16) NOT NULL,
  preferred_chain_id VARCHAR(32) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT token_preferences_unique_user_token UNIQUE (user_id, token_symbol),
  CONSTRAINT fk_token_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for token_preferences
CREATE INDEX IF NOT EXISTS idx_token_preferences_user_id ON token_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_token_preferences_token_symbol ON token_preferences(token_symbol);

-- Success message
SELECT 'Tables created successfully!' AS status;
