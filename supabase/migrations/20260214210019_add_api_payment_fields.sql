/*
  # Add API Payment Integration Fields
  
  1. Changes
    - Add `external_reference` column to store provider transaction IDs
    - Update status CHECK constraint to include 'waiting_confirmation' and 'failed'
    - Add index on external_reference for faster lookups
    
  2. Important Notes
    - external_reference stores the transaction ID returned by Zaad/eDahab API
    - waiting_confirmation status indicates payment request sent to customer
    - failed status indicates payment was declined or failed
*/

DO $$
BEGIN
  -- Add external_reference column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mobile_money_payments' AND column_name = 'external_reference'
  ) THEN
    ALTER TABLE mobile_money_payments ADD COLUMN external_reference text;
  END IF;
END $$;

-- Drop existing CHECK constraint on status
ALTER TABLE mobile_money_payments 
  DROP CONSTRAINT IF EXISTS mobile_money_payments_status_check;

-- Add updated CHECK constraint with new statuses
ALTER TABLE mobile_money_payments 
  ADD CONSTRAINT mobile_money_payments_status_check 
  CHECK (status IN ('pending', 'waiting_confirmation', 'confirmed', 'failed', 'expired', 'cancelled'));

-- Create index for faster lookups by external reference
CREATE INDEX IF NOT EXISTS idx_mobile_money_payments_external_ref 
  ON mobile_money_payments(external_reference);
