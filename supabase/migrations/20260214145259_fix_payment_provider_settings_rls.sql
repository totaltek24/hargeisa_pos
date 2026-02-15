/*
  # Fix Payment Provider Settings RLS Policies

  1. Changes
    - Update RLS policies to allow anon users to read payment provider settings
    - This allows the mobile money payment system to fetch merchant phone numbers
    
  2. Security
    - Anon users can only read (not modify) payment provider settings
    - Write operations still require authentication
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own payment settings" ON payment_provider_settings;

-- Create new policy that allows anon users to read
CREATE POLICY "Allow anon users to read payment provider settings"
  ON payment_provider_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);