-- Add fingerprint column for device binding
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS claimed_by_fingerprint text;

-- Index for fast fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_invite_codes_fingerprint ON invite_codes (claimed_by_fingerprint) WHERE claimed_by_fingerprint IS NOT NULL;
