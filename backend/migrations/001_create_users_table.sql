-- Migration: 001_create_users_table
-- Description: Create users table with global identifiers

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_id         VARCHAR(64) NOT NULL,
  nickname          VARCHAR(32),
  email             VARCHAR(255),
  avatar_url        TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT users_global_id_unique UNIQUE (global_id),
  CONSTRAINT users_nickname_unique UNIQUE (nickname),
  CONSTRAINT users_nickname_format CHECK (
    nickname IS NULL OR 
    (nickname ~ '^[a-z0-9_]{3,32}$' AND LENGTH(nickname) >= 3 AND LENGTH(nickname) <= 32)
  ),
  CONSTRAINT users_email_format CHECK (
    email IS NULL OR 
    email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

-- Indexes
CREATE INDEX idx_users_nickname ON users(nickname) WHERE nickname IS NOT NULL;
CREATE INDEX idx_users_global_id ON users(global_id);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE users IS 'User profiles with global identifiers';
COMMENT ON COLUMN users.global_id IS 'Public identifier (e.g., EY-ABC123XYZ)';
COMMENT ON COLUMN users.nickname IS 'Optional human-readable nickname (lowercase, digits, underscore)';
