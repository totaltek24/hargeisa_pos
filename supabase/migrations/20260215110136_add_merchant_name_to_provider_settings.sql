/*
  # Add Merchant Name to Payment Provider Settings

  1. Changes
    - Add `merchant_name` column to `payment_provider_settings` table
    - This will store the business name that appears on customer phones during mobile money payments

  2. Important Notes
    - This field controls what customers see when they receive payment requests
    - Each merchant should see their own business name instead of "SIFALO PAY"
    - Critical for SaaS multi-tenant functionality
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_provider_settings' AND column_name = 'merchant_name'
  ) THEN
    ALTER TABLE payment_provider_settings ADD COLUMN merchant_name text;
  END IF;
END $$;
