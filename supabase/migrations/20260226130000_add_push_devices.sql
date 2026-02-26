-- Push notification device registrations
CREATE TABLE IF NOT EXISTS push_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  push_token TEXT NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name VARCHAR(100),
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for looking up devices by wallet address
CREATE INDEX IF NOT EXISTS idx_push_devices_wallet_address ON push_devices (wallet_address);

-- Unique constraint: one token per device
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_devices_push_token ON push_devices (push_token);

-- Index for active devices
CREATE INDEX IF NOT EXISTS idx_push_devices_active ON push_devices (active) WHERE active = true;

-- Enable Row Level Security
ALTER TABLE push_devices ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on push_devices"
  ON push_devices
  FOR ALL
  USING (true)
  WITH CHECK (true);
