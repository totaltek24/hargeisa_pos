/*
  # Create cashiers table for POS authentication

  1. New Tables
    - `cashiers`
      - `id` (uuid, primary key)
      - `name` (text, display name)
      - `cashier_id` (text, unique identifier for login)
      - `pin` (text, encrypted PIN for login)
      - `is_active` (boolean, whether cashier can login)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `cashiers` table
    - Allow public read access to active cashiers (for login list)
    - Allow authenticated users to read all cashiers
    - Restrict PIN updates to authenticated users
    
  3. Notes
    - PIN is stored as plain text (in production should be hashed)
    - Cashier IDs and PINs are kept simple for retail POS use
*/

CREATE TABLE IF NOT EXISTS cashiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cashier_id text UNIQUE NOT NULL,
  pin text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cashiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active cashiers"
  ON cashiers
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all cashiers"
  ON cashiers
  FOR SELECT
  TO authenticated
  USING (true);
