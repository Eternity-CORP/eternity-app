-- E-Y Supabase Schema Migration
-- This migration creates all tables for the unified database

-- ============================================
-- 1. USERNAMES (unified from API + Web)
-- ============================================
CREATE TABLE IF NOT EXISTS usernames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address VARCHAR(42) UNIQUE NOT NULL,
  username VARCHAR(20) UNIQUE NOT NULL,
  signature TEXT,  -- nullable for web registrations
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usernames_address ON usernames(address);
CREATE INDEX IF NOT EXISTS idx_usernames_username ON usernames(username);

-- ============================================
-- 2. TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash VARCHAR(66) NOT NULL,
  from_address VARCHAR(42) NOT NULL,
  to_address VARCHAR(42) NOT NULL,
  amount VARCHAR(78) NOT NULL,  -- decimal string for precision
  token_symbol VARCHAR(10) NOT NULL DEFAULT 'ETH',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, confirmed, failed
  direction VARCHAR(10),  -- sent, received (can be computed)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(hash);

-- ============================================
-- 3. BLIK CODES
-- ============================================
CREATE TABLE IF NOT EXISTS blik_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) NOT NULL,
  sender_address VARCHAR(42) NOT NULL,
  amount VARCHAR(78) NOT NULL,
  token_symbol VARCHAR(10) NOT NULL DEFAULT 'ETH',
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, pending, completed, expired
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blik_codes_code ON blik_codes(code);
CREATE INDEX IF NOT EXISTS idx_blik_codes_sender ON blik_codes(sender_address);
CREATE INDEX IF NOT EXISTS idx_blik_codes_status ON blik_codes(status);

-- ============================================
-- 4. PUSH DEVICES (from API)
-- ============================================
CREATE TABLE IF NOT EXISTS push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) NOT NULL,
  push_token TEXT UNIQUE NOT NULL,
  platform VARCHAR(10) NOT NULL DEFAULT 'ios',  -- ios, android
  device_name VARCHAR(100),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_devices_wallet ON push_devices(wallet_address);
CREATE INDEX IF NOT EXISTS idx_push_devices_active ON push_devices(active);

-- ============================================
-- 5. SPLIT BILLS (from API)
-- ============================================
CREATE TABLE IF NOT EXISTS split_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_address VARCHAR(42) NOT NULL,
  creator_username VARCHAR(20),
  total_amount DECIMAL(36, 18) NOT NULL,
  token_symbol VARCHAR(10) NOT NULL DEFAULT 'ETH',
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_split_bills_creator ON split_bills(creator_address);
CREATE INDEX IF NOT EXISTS idx_split_bills_status ON split_bills(status);

-- ============================================
-- 6. SPLIT PARTICIPANTS (from API)
-- ============================================
CREATE TABLE IF NOT EXISTS split_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES split_bills(id) ON DELETE CASCADE,
  address VARCHAR(42) NOT NULL,
  username VARCHAR(20),
  name VARCHAR(50),
  amount DECIMAL(36, 18) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, paid
  paid_tx_hash VARCHAR(66),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_split_participants_split ON split_participants(split_id);
CREATE INDEX IF NOT EXISTS idx_split_participants_address ON split_participants(address);

-- ============================================
-- 7. SCHEDULED PAYMENTS (from API)
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_address VARCHAR(42) NOT NULL,
  recipient VARCHAR(42) NOT NULL,
  recipient_username VARCHAR(20),
  recipient_name VARCHAR(50),
  amount DECIMAL(36, 18) NOT NULL,
  token_symbol VARCHAR(10) NOT NULL DEFAULT 'ETH',
  scheduled_at TIMESTAMPTZ NOT NULL,
  recurring_interval VARCHAR(20),  -- daily, weekly, monthly
  recurring_end_date TIMESTAMPTZ,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, executed, cancelled, failed
  executed_tx_hash VARCHAR(66),
  executed_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT FALSE,
  signed_transaction TEXT,
  estimated_gas_price BIGINT,
  nonce INTEGER,
  chain_id INTEGER,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_payments_creator ON scheduled_payments(creator_address);
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_status ON scheduled_payments(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_scheduled ON scheduled_payments(scheduled_at);

-- ============================================
-- 8. ADDRESS PREFERENCES (from API)
-- ============================================
CREATE TABLE IF NOT EXISTS address_preferences (
  address VARCHAR(42) PRIMARY KEY,
  default_network VARCHAR(20),
  token_overrides JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. AI SUGGESTIONS (from API)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address VARCHAR(42) NOT NULL,
  type VARCHAR(50) NOT NULL,  -- payment_reminder, security_alert, transaction_tip, savings_tip, contact_suggestion
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action JSONB,  -- {label, route, type, payload}
  priority VARCHAR(20) DEFAULT 'low',  -- low, medium, high
  status VARCHAR(20) DEFAULT 'pending',  -- pending, shown, dismissed, actioned
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  shown_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user ON ai_suggestions(user_address);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON ai_suggestions(user_address, status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created ON ai_suggestions(user_address, created_at);

-- ============================================
-- 10. WAITLIST (from API)
-- ============================================
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  is_beta_tester BOOLEAN DEFAULT FALSE,
  ip VARCHAR(45),
  user_agent TEXT,
  source VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

-- ============================================
-- ENABLE REALTIME FOR REQUIRED TABLES
-- ============================================
-- Enable realtime for BLIK codes (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE blik_codes;

-- Enable realtime for split bills (for live payment updates)
ALTER PUBLICATION supabase_realtime ADD TABLE split_bills;
ALTER PUBLICATION supabase_realtime ADD TABLE split_participants;

-- ============================================
-- UPDATE TRIGGERS FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usernames_updated_at
  BEFORE UPDATE ON usernames
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_devices_updated_at
  BEFORE UPDATE ON push_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_split_bills_updated_at
  BEFORE UPDATE ON split_bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_payments_updated_at
  BEFORE UPDATE ON scheduled_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_address_preferences_updated_at
  BEFORE UPDATE ON address_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on all tables
ALTER TABLE usernames ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blik_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE address_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Public read/write for usernames (anyone can register/lookup)
CREATE POLICY "Usernames are public" ON usernames FOR ALL USING (true);

-- Public read/write for transactions (logged by apps)
CREATE POLICY "Transactions are public" ON transactions FOR ALL USING (true);

-- Public read/write for BLIK codes
CREATE POLICY "BLIK codes are public" ON blik_codes FOR ALL USING (true);

-- Public read/write for push devices
CREATE POLICY "Push devices are public" ON push_devices FOR ALL USING (true);

-- Public read/write for split bills
CREATE POLICY "Split bills are public" ON split_bills FOR ALL USING (true);
CREATE POLICY "Split participants are public" ON split_participants FOR ALL USING (true);

-- Public read/write for scheduled payments
CREATE POLICY "Scheduled payments are public" ON scheduled_payments FOR ALL USING (true);

-- Public read/write for address preferences
CREATE POLICY "Address preferences are public" ON address_preferences FOR ALL USING (true);

-- Public read/write for AI suggestions
CREATE POLICY "AI suggestions are public" ON ai_suggestions FOR ALL USING (true);

-- Public insert for waitlist, admin read
CREATE POLICY "Anyone can join waitlist" ON waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Waitlist is readable" ON waitlist FOR SELECT USING (true);
