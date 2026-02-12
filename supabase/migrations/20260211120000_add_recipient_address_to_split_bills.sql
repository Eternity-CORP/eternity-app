-- Add recipient_address column to split_bills table
-- Allows split creators to specify a different address for receiving payments
ALTER TABLE split_bills ADD COLUMN IF NOT EXISTS recipient_address TEXT;
