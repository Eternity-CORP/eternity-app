-- Migration: 005_create_transactions_log_table
-- Description: Create transactions_log table for audit trail

CREATE TABLE transactions_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id      UUID,
  to_user_id        UUID,
  
  amount            DECIMAL(36, 18) NOT NULL,
  token_symbol      VARCHAR(16) NOT NULL,
  chain_id          VARCHAR(32) NOT NULL,
  
  tx_hash           VARCHAR(128) NOT NULL,
  tx_status         VARCHAR(16) NOT NULL DEFAULT 'pending',
  
  payment_request_id UUID,
  
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  confirmed_at      TIMESTAMP,
  
  metadata          JSONB,
  
  -- Foreign Keys
  CONSTRAINT fk_transactions_log_from_user 
    FOREIGN KEY (from_user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL,
  CONSTRAINT fk_transactions_log_to_user 
    FOREIGN KEY (to_user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL,
  CONSTRAINT fk_transactions_log_payment_request 
    FOREIGN KEY (payment_request_id) 
    REFERENCES payment_requests(id) 
    ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT transactions_log_amount_positive 
    CHECK (amount > 0),
  CONSTRAINT transactions_log_tx_status_valid 
    CHECK (tx_status IN ('pending', 'confirmed', 'failed')),
  CONSTRAINT transactions_log_confirmed_after_created 
    CHECK (confirmed_at IS NULL OR confirmed_at >= created_at)
);

-- Indexes
CREATE INDEX idx_transactions_log_from_user_id ON transactions_log(from_user_id) WHERE from_user_id IS NOT NULL;
CREATE INDEX idx_transactions_log_to_user_id ON transactions_log(to_user_id) WHERE to_user_id IS NOT NULL;
CREATE INDEX idx_transactions_log_tx_hash ON transactions_log(tx_hash);
CREATE INDEX idx_transactions_log_payment_request_id ON transactions_log(payment_request_id) WHERE payment_request_id IS NOT NULL;
CREATE INDEX idx_transactions_log_created_at ON transactions_log(created_at DESC);
CREATE INDEX idx_transactions_log_tx_status ON transactions_log(tx_status);

-- Comments
COMMENT ON TABLE transactions_log IS 'Audit log of all payment transactions';
COMMENT ON COLUMN transactions_log.tx_status IS 'Transaction status: pending, confirmed, failed';
COMMENT ON COLUMN transactions_log.payment_request_id IS 'Reference to BLIK payment request if applicable';
