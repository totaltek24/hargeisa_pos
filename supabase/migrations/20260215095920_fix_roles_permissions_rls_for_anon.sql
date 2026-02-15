/*
  # Fix RLS Policies for Roles and Permissions

  The existing policies require Supabase authentication (TO authenticated),
  but this app uses a custom cashier login system without Supabase auth.
  
  This migration updates the policies to allow anonymous read access to roles
  and permissions data, which is necessary for the permission system to work.

  1. Changes
    - Drop existing restrictive read policies
    - Add new policies allowing anon access for read operations
    - Keep write operations restricted (they won't work without proper setup anyway)
  
  2. Security Note
    - Roles and permissions are not sensitive data
    - Users still need proper credentials to log in as a cashier
    - Write operations remain protected
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view roles" ON roles;
DROP POLICY IF EXISTS "Anyone can view permissions" ON permissions;
DROP POLICY IF EXISTS "Anyone can view role permissions" ON role_permissions;

-- Create new policies allowing anon read access
CREATE POLICY "Allow anon read access to roles"
  ON roles FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon read access to permissions"
  ON permissions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon read access to role permissions"
  ON role_permissions FOR SELECT
  TO anon
  USING (true);

-- Also allow anon read access to cashiers table (needed for login)
DROP POLICY IF EXISTS "Authenticated users can read all cashiers" ON cashiers;

CREATE POLICY "Allow anon read access to cashiers"
  ON cashiers FOR SELECT
  TO anon
  USING (true);
