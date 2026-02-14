-- Business Wallet tables
-- Stores off-chain metadata for tokenized business entities

-- Business registry (metadata cache, source of truth is on-chain)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  description VARCHAR(200),
  icon VARCHAR(10),
  token_symbol VARCHAR(6) NOT NULL,
  token_supply INTEGER NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  treasury_address VARCHAR(42) NOT NULL,
  factory_tx_hash VARCHAR(66) NOT NULL,
  network VARCHAR(20) NOT NULL DEFAULT 'sepolia',
  transfer_policy VARCHAR(20) NOT NULL DEFAULT 'FREE',
  quorum_threshold INTEGER NOT NULL DEFAULT 5100,
  voting_period INTEGER NOT NULL DEFAULT 172800,
  vesting_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  vesting_config JSONB,
  dividends_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  dividends_config JSONB,
  created_by VARCHAR(42) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Business members (cache, source of truth is on-chain token balances)
CREATE TABLE business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  address VARCHAR(42) NOT NULL,
  username VARCHAR(20),
  initial_shares INTEGER NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, address)
);

-- Proposal metadata (details cache for off-chain display)
CREATE TABLE business_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  on_chain_id INTEGER NOT NULL,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  data_json JSONB,
  deadline TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by VARCHAR(42) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity log
CREATE TABLE business_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  description TEXT NOT NULL,
  actor_address VARCHAR(42),
  tx_hash VARCHAR(66),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_businesses_created_by ON businesses(created_by);
CREATE INDEX idx_businesses_contract_address ON businesses(contract_address);
CREATE INDEX idx_business_members_address ON business_members(address);
CREATE INDEX idx_business_members_business ON business_members(business_id);
CREATE INDEX idx_business_proposals_business ON business_proposals(business_id);
CREATE INDEX idx_business_proposals_status ON business_proposals(status);
CREATE INDEX idx_business_activity_business ON business_activity(business_id);
CREATE INDEX idx_business_activity_created_at ON business_activity(created_at);

-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_activity ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API uses service key)
CREATE POLICY "Service role full access" ON businesses FOR ALL USING (true);
CREATE POLICY "Service role full access" ON business_members FOR ALL USING (true);
CREATE POLICY "Service role full access" ON business_proposals FOR ALL USING (true);
CREATE POLICY "Service role full access" ON business_activity FOR ALL USING (true);
