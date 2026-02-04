-- Fix BLIK codes schema
-- The original schema had incorrect column naming:
-- - "sender_address" was actually the receiver (person creating the code to receive payment)
--
-- Correct terminology:
-- - receiver_address: the person who creates the code and RECEIVES payment
-- - sender_address: the person who looks up the code and SENDS payment

-- Rename existing column (sender_address -> receiver_address)
ALTER TABLE blik_codes RENAME COLUMN sender_address TO receiver_address;

-- Add missing columns
ALTER TABLE blik_codes ADD COLUMN IF NOT EXISTS receiver_username VARCHAR(20);
ALTER TABLE blik_codes ADD COLUMN IF NOT EXISTS receiver_socket_id TEXT;
ALTER TABLE blik_codes ADD COLUMN IF NOT EXISTS sender_address VARCHAR(42);
ALTER TABLE blik_codes ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66);
ALTER TABLE blik_codes ADD COLUMN IF NOT EXISTS network VARCHAR(20);

-- Update indexes
DROP INDEX IF EXISTS idx_blik_codes_sender;
CREATE INDEX IF NOT EXISTS idx_blik_codes_receiver ON blik_codes(receiver_address);
CREATE INDEX IF NOT EXISTS idx_blik_codes_sender ON blik_codes(sender_address);
