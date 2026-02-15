/*
  # Fix time clock entries RLS for anonymous access

  1. Changes
    - Drop existing RLS policies that require authenticated users
    - Create new policies that allow anonymous (anon) users
    - Enable full access for SELECT, INSERT, and UPDATE operations
  
  2. Security
    - Policies now work with anon key instead of requiring authentication
    - This matches the app's authentication model where cashiers use the anon key
*/

DROP POLICY IF EXISTS "Anyone can view time clock entries" ON time_clock_entries;
DROP POLICY IF EXISTS "Anyone can insert time clock entries" ON time_clock_entries;
DROP POLICY IF EXISTS "Anyone can update time clock entries" ON time_clock_entries;

CREATE POLICY "Allow anon to view time clock entries"
  ON time_clock_entries
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert time clock entries"
  ON time_clock_entries
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update time clock entries"
  ON time_clock_entries
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
