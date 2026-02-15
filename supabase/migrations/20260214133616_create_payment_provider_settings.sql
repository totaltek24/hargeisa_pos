/*
  # Create Payment Provider Settings Table

  1. New Tables
    - `payment_provider_settings`
      - `id` (uuid, primary key)
      - `merchant_id` (text) - Unique identifier for each merchant
      - `provider` (text) - Payment provider name (e.g., 'waafi', 'evc_plus')
      - `api_key` (text) - API key for the provider
      - `api_secret` (text) - API secret for the provider
      - `merchant_code` (text) - Merchant code from provider
      - `is_active` (boolean) - Whether this provider is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `payment_provider_settings` table
    - Add policy for authenticated users to manage their payment settings
    
  3. Important Notes
    - This table stores merchant-specific payment provider credentials
    - Each merchant can have multiple payment providers configured
    - Credentials are stored securely and only accessible via edge functions
*/

CREATE TABLE IF NOT EXISTS payment_provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id text NOT NULL,
  provider text NOT NULL,
  api_key text,
  api_secret text,
  merchant_code text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(merchant_id, provider)
);

ALTER TABLE payment_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment settings"
  ON payment_provider_settings
  FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid()::text);

CREATE POLICY "Users can insert their own payment settings"
  ON payment_provider_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id = auth.uid()::text);

CREATE POLICY "Users can update their own payment settings"
  ON payment_provider_settings
  FOR UPDATE
  TO authenticated
  USING (merchant_id = auth.uid()::text)
  WITH CHECK (merchant_id = auth.uid()::text);

CREATE POLICY "Users can delete their own payment settings"
  ON payment_provider_settings
  FOR DELETE
  TO authenticated
  USING (merchant_id = auth.uid()::text);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_provider_settings_merchant_id 
  ON payment_provider_settings(merchant_id);

CREATE INDEX IF NOT EXISTS idx_payment_provider_settings_provider 
  ON payment_provider_settings(merchant_id, provider, is_active);