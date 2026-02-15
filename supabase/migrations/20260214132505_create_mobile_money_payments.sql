/*
  # Create Mobile Money Payments Table

  1. New Tables
    - `mobile_money_payments`
      - `id` (uuid, primary key) - Unique payment ID
      - `transaction_reference` (text, unique) - Unique reference shown to customer
      - `payment_method` (text) - Payment method: 'zaad', 'edahab', or 'waafi'
      - `amount` (numeric) - Payment amount
      - `merchant_phone` (text) - Merchant's mobile money number
      - `customer_phone` (text, optional) - Customer's phone number if provided
      - `status` (text) - Payment status: 'pending', 'confirmed', 'expired', 'cancelled'
      - `qr_code_data` (text, optional) - QR code data for Waafi payments
      - `confirmed_by` (uuid, optional) - Cashier who confirmed payment
      - `confirmed_at` (timestamptz, optional) - When payment was confirmed
      - `expires_at` (timestamptz) - When payment expires (default 15 minutes)
      - `created_at` (timestamptz) - When payment was initiated
      - `updated_at` (timestamptz) - Last update timestamp
      - `notes` (text, optional) - Additional notes or transaction details

  2. Security
    - Enable RLS on `mobile_money_payments` table
    - Add policy for authenticated users to read all payments
    - Add policy for authenticated users to create payments
    - Add policy for authenticated users to update payment status
*/

CREATE TABLE IF NOT EXISTS mobile_money_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_reference text UNIQUE NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('zaad', 'edahab', 'waafi')),
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  merchant_phone text NOT NULL,
  customer_phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
  qr_code_data text,
  confirmed_by uuid,
  confirmed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text
);

ALTER TABLE mobile_money_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mobile money payments"
  ON mobile_money_payments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create mobile money payments"
  ON mobile_money_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update mobile money payments"
  ON mobile_money_payments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete mobile money payments"
  ON mobile_money_payments
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster lookups by reference
CREATE INDEX IF NOT EXISTS idx_mobile_money_payments_reference 
  ON mobile_money_payments(transaction_reference);

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_mobile_money_payments_status 
  ON mobile_money_payments(status, created_at);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mobile_money_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_mobile_money_payments_updated_at
  BEFORE UPDATE ON mobile_money_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_mobile_money_payments_updated_at();