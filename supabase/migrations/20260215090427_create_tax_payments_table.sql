/*
  # Create Tax Payments Table

  1. New Tables
    - `tax_payments`
      - `id` (uuid, primary key) - Unique identifier
      - `amount` (numeric) - Tax amount paid in USD
      - `payment_date` (date) - Date tax was paid
      - `receipt_reference` (text, optional) - Government receipt reference number
      - `period` (text) - Tax period (e.g., "January 2026", "Q1 2026", "2026")
      - `notes` (text, optional) - Additional notes
      - `created_by` (text) - User who recorded the payment
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `tax_payments` table
    - Add policy for authenticated users to manage tax payments
*/

CREATE TABLE IF NOT EXISTS tax_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  payment_date date NOT NULL,
  receipt_reference text,
  period text NOT NULL,
  notes text,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tax_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tax payments"
  ON tax_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tax payments"
  ON tax_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tax payments"
  ON tax_payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tax payments"
  ON tax_payments FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_tax_payments_date ON tax_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_tax_payments_period ON tax_payments(period);