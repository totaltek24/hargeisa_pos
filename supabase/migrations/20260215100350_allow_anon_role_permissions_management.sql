/*
  # Allow Anonymous Role Permissions Management

  Since the app uses a custom cashier authentication system (not Supabase auth),
  we need to allow anonymous users to manage role permissions. The UI layer 
  enforces permission checks through the custom role system.

  1. Changes
    - Add policies allowing anon users to insert and delete role_permissions
    - Keep the existing read policy for anon users
  
  2. Security Note
    - The UI restricts role permission management to Owners only
    - In production, consider adding application-level auth middleware
*/

-- Allow anon to insert role permissions
CREATE POLICY "Allow anon to insert role permissions"
  ON role_permissions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon to delete role permissions
CREATE POLICY "Allow anon to delete role permissions"
  ON role_permissions FOR DELETE
  TO anon
  USING (true);
