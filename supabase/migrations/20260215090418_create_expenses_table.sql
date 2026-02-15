/*
  # Create Expenses Table

  1. New Tables
    - `expenses`
      - `id` (uuid, primary key) - Unique identifier
      - `description` (text) - Expense description
      - `amount` (numeric) - Amount in USD
      - `category` (text) - Expense category (rent, utilities, supplies, salaries, etc.)
      - `date` (date) - Date of expense
      - `payment_method` (text) - Payment method used (cash, zaad, edahab)
      - `receipt_number` (text, optional) - Receipt reference number
      - `notes` (text, optional) - Additional notes
      - `created_by` (text) - User who created the record
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `expenses` table
    - Add policy for authenticated users to manage expenses
*/

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  category text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'zaad', 'edahab')),
  receipt_number text,
  notes text,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);