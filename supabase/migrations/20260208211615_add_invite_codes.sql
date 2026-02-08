-- Invite codes table for gated access
CREATE TABLE IF NOT EXISTS invite_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  claimed_at timestamptz,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Allow read invite_codes" ON invite_codes FOR SELECT USING (true);
CREATE POLICY "Allow insert invite_codes" ON invite_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update invite_codes" ON invite_codes FOR UPDATE USING (true);
