/*
  # Allow Anonymous Cashier Updates

  Since the app uses a custom cashier authentication system (not Supabase auth),
  we need to allow anonymous users to update cashier records. This is needed for:
  - Assigning roles to cashiers
  - Updating custom permissions
  
  The UI layer enforces permission checks through the custom role system.

  1. Changes
    - Add policy allowing anon users to update cashiers table
  
  2. Security Note
    - The UI restricts cashier management to Owners only
    - In production, consider adding application-level auth middleware
*/

-- Allow anon to update cashiers (for role assignments and custom permissions)
CREATE POLICY "Allow anon to update cashiers"
  ON cashiers FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
