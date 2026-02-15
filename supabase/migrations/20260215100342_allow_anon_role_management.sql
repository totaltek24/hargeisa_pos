/*
  # Allow Anonymous Role Management

  Since the app uses a custom cashier authentication system (not Supabase auth),
  we need to allow anonymous users to manage roles. The UI layer enforces
  permission checks through the custom role system.

  1. Changes
    - Add policies allowing anon users to insert, update, and delete roles
    - Keep the existing read policy for anon users
  
  2. Security Note
    - The UI restricts role management to Owners only
    - In production, consider adding application-level auth middleware
*/

-- Allow anon to insert roles
CREATE POLICY "Allow anon to insert roles"
  ON roles FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon to update roles
CREATE POLICY "Allow anon to update roles"
  ON roles FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon to delete roles
CREATE POLICY "Allow anon to delete roles"
  ON roles FOR DELETE
  TO anon
  USING (true);
