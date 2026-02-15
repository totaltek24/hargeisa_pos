/*
  # Add Customer Details to Mobile Money Payments

  1. Changes
    - Add customer_name to track who sent the payment
    - Add sender_phone to track sender's phone number
    - Add payment_currency to track if paid in USD or SLSH
    - Add amount_received to track actual amount received
    - Add transaction_items to store JSON of purchased items
    - Add notes for additional information
    - Add confirmed_by to track which cashier confirmed
    
  2. Important Notes
    - These fields help resolve disputes by tracking who paid what
    - transaction_items stores the cart contents at time of payment
    - Merchant manually confirms after checking their separate phone
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mobile_money_payments' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE mobile_money_payments ADD COLUMN customer_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mobile_money_payments' AND column_name = 'sender_phone'
  ) THEN
    ALTER TABLE mobile_money_payments ADD COLUMN sender_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mobile_money_payments' AND column_name = 'payment_currency'
  ) THEN
    ALTER TABLE mobile_money_payments ADD COLUMN payment_currency text DEFAULT 'USD';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mobile_money_payments' AND column_name = 'amount_received'
  ) THEN
    ALTER TABLE mobile_money_payments ADD COLUMN amount_received numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mobile_money_payments' AND column_name = 'transaction_items'
  ) THEN
    ALTER TABLE mobile_money_payments ADD COLUMN transaction_items jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mobile_money_payments' AND column_name = 'notes'
  ) THEN
    ALTER TABLE mobile_money_payments ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mobile_money_payments' AND column_name = 'confirmed_by'
  ) THEN
    ALTER TABLE mobile_money_payments ADD COLUMN confirmed_by text;
  END IF;
END $$;