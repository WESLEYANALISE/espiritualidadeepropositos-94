-- Add missing fields to payment_requests table
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS mp_payment_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS raw JSONB;

-- Create index for better performance on mp_payment_id lookups
CREATE INDEX IF NOT EXISTS idx_payment_requests_mp_payment_id 
ON payment_requests(mp_payment_id) WHERE mp_payment_id IS NOT NULL;