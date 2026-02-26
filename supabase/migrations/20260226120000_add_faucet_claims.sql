-- Faucet claims table
-- Persists faucet cooldown tracking so it survives server restarts

CREATE TABLE faucet_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) NOT NULL,
  amount VARCHAR(30) NOT NULL,
  tx_hash VARCHAR(66),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on wallet_address + claimed_at for efficient cooldown lookups
CREATE INDEX idx_faucet_claims_wallet_address ON faucet_claims(wallet_address);
CREATE INDEX idx_faucet_claims_claimed_at ON faucet_claims(claimed_at);

-- Enable RLS
ALTER TABLE faucet_claims ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API uses service key)
CREATE POLICY "Service role full access" ON faucet_claims FOR ALL USING (true);
