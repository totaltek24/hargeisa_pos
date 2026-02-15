/*
  # Add Merchant Phone to Payment Provider Settings

  1. Changes
    - Add merchant_phone column to store the phone number for each payment provider
    - This allows merchants to have different numbers for Zaad, eDahab, and Waafi
    
  2. Important Notes
    - Each payment provider (zaad, edahab, waafi) can have its own merchant phone number
    - QR codes will be generated from these phone numbers
    - This supports multi-merchant scenarios where each provider may have different numbers
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_provider_settings' AND column_name = 'merchant_phone'
  ) THEN
    ALTER TABLE payment_provider_settings ADD COLUMN merchant_phone text;
  END IF;
END $$;