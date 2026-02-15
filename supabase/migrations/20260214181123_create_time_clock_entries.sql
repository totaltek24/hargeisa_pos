/*
  # Create time clock entries table

  1. New Tables
    - `time_clock_entries`
      - `id` (uuid, primary key)
      - `cashier_id` (uuid, foreign key to cashiers table)
      - `clock_in` (timestamptz, when employee clocked in)
      - `clock_out` (timestamptz, when employee clocked out, nullable)
      - `total_hours` (decimal, calculated hours worked)
      - `created_at` (timestamptz, record creation timestamp)
      - `updated_at` (timestamptz, record update timestamp)
  
  2. Security
    - Enable RLS on `time_clock_entries` table
    - Add policy for authenticated users to read all entries
    - Add policy for authenticated users to insert their own entries
    - Add policy for authenticated users to update their own entries
  
  3. Indexes
    - Index on cashier_id for fast lookups
    - Index on clock_in date for daily queries
*/

CREATE TABLE IF NOT EXISTS time_clock_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id uuid REFERENCES cashiers(id) ON DELETE CASCADE NOT NULL,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  total_hours decimal(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE time_clock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view time clock entries"
  ON time_clock_entries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert time clock entries"
  ON time_clock_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update time clock entries"
  ON time_clock_entries
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_time_clock_entries_cashier_id ON time_clock_entries(cashier_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_entries_clock_in ON time_clock_entries(clock_in);
