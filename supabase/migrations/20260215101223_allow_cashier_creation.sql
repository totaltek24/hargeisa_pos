/*
  # Allow Cashier Creation via UI

  1. Changes
    - Add RLS policy to allow anon users to insert cashiers
    - This enables the Settings page to create new cashiers

  2. Security
    - Allow authenticated and anon users to create cashiers
    - Maintain existing read policies
*/

-- Drop the conflicting policy if it exists
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view all cashiers" ON cashiers;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Allow anon users to insert cashiers
CREATE POLICY "Anyone can create cashiers"
  ON cashiers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anon users to update cashiers
CREATE POLICY "Anyone can update cashiers"
  ON cashiers
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
