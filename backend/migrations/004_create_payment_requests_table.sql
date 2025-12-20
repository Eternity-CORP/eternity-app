-- Migration: 004_create_payment_requests_table
-- Description: Create payment_requests table for BLIK-like payment codes

CREATE TABLE payment_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(8) NOT NULL,
  to_user_id        UUID NOT NULL,
  from_user_id      UUID,
  
  amount            DECIMAL(36, 18) NOT NULL,
  token_symbol      VARCHAR(16) NOT NULL,
  preferred_chain_id VARCHAR(32),
  
  status            VARCHAR(16) NOT NULL DEFAULT 'pending',
  
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMP NOT NULL,
  executed_at       TIMESTAMP,
  
  tx_hash           VARCHAR(128),
  actual_chain_id   VARCHAR(32),
  
  metadata          JSONB,
  
  -- Foreign Keys
  CONSTRAINT fk_payment_requests_to_user 
    FOREIGN KEY (to_user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
  CONSTRAINT fk_payment_requests_from_user 
    FOREIGN KEY (from_user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT payment_requests_code_unique 
    UNIQUE (code),
  CONSTRAINT payment_requests_code_format 
    CHECK (code ~ '^[2-9A-HJ-NP-Z]{6,8}$'),
  CONSTRAINT payment_requests_status_valid 
    CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  CONSTRAINT payment_requests_amount_positive 
    CHECK (amount > 0),
  CONSTRAINT payment_requests_token_symbol_valid 
    CHECK (LENGTH(TRIM(token_symbol)) > 0 AND token_symbol = UPPER(token_symbol)),
  CONSTRAINT payment_requests_expires_after_created 
    CHECK (expires_at > created_at),
  CONSTRAINT payment_requests_executed_after_created 
    CHECK (executed_at IS NULL OR executed_at >= created_at),
  CONSTRAINT payment_requests_completed_has_from_user 
    CHECK (status != 'completed' OR from_user_id IS NOT NULL),
  CONSTRAINT payment_requests_completed_has_tx_hash 
    CHECK (status != 'completed' OR tx_hash IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_payment_requests_code ON payment_requests(code);
CREATE INDEX idx_payment_requests_to_user_id ON payment_requests(to_user_id);
CREATE INDEX idx_payment_requests_from_user_id ON payment_requests(from_user_id) WHERE from_user_id IS NOT NULL;
CREATE INDEX idx_payment_requests_status ON payment_requests(status);
CREATE INDEX idx_payment_requests_expires_at ON payment_requests(expires_at) WHERE status = 'pending';
CREATE INDEX idx_payment_requests_created_at ON payment_requests(created_at DESC);
CREATE INDEX idx_payment_requests_tx_hash ON payment_requests(tx_hash) WHERE tx_hash IS NOT NULL;

-- Comments
COMMENT ON TABLE payment_requests IS 'BLIK-like payment requests with one-time codes';
COMMENT ON COLUMN payment_requests.code IS 'Unique 6-8 character code (digits 2-9, uppercase letters excluding O, I, S)';
COMMENT ON COLUMN payment_requests.status IS 'Request status: pending, completed, expired, cancelled';
COMMENT ON COLUMN payment_requests.expires_at IS 'Expiration timestamp (TTL, typically 15 minutes)';
