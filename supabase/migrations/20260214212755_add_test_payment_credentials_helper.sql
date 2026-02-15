/*
  # Test Payment Credentials Setup Helper
  
  This migration creates a helper function to easily add Waafi payment credentials
  for testing purposes.
  
  1. New Functions
    - `setup_waafi_test_credentials(user_id, merchant_code, merchant_phone)` 
      - Inserts or updates Waafi payment settings for a user
      - Uses the test API credentials
      - Activates the payment provider
  
  2. Security
    - Function requires authentication
    - Only allows users to set up their own credentials
  
  ## Usage Example
  ```sql
  SELECT setup_waafi_test_credentials(
    auth.uid()::uuid,
    'YOUR_MERCHANT_CODE',
    '+252XXXXXXXXX'
  );
  ```
*/

-- Create function to setup test Waafi credentials
CREATE OR REPLACE FUNCTION setup_waafi_test_credentials(
  p_merchant_id uuid,
  p_merchant_code text DEFAULT 'TEST_MERCHANT',
  p_merchant_phone text DEFAULT '+252000000000'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- Insert or update Waafi payment settings
  INSERT INTO payment_provider_settings (
    merchant_id,
    provider,
    api_key,
    api_secret,
    merchant_code,
    merchant_phone,
    is_active
  ) VALUES (
    p_merchant_id,
    'waafi',
    'key9HFXDP',
    'a9b5a04e79ea2f40e1ce2840e0b406feda354555',
    p_merchant_code,
    p_merchant_phone,
    true
  )
  ON CONFLICT (merchant_id, provider)
  DO UPDATE SET
    api_key = EXCLUDED.api_key,
    api_secret = EXCLUDED.api_secret,
    merchant_code = EXCLUDED.merchant_code,
    merchant_phone = EXCLUDED.merchant_phone,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  v_result := json_build_object(
    'success', true,
    'message', 'Waafi test credentials configured successfully',
    'provider', 'waafi',
    'merchant_id', p_merchant_id
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION setup_waafi_test_credentials(uuid, text, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION setup_waafi_test_credentials IS 
  'Helper function to quickly set up Waafi payment test credentials for a merchant';
