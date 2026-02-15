/*
  # Seed default cashiers

  Insert default cashiers for the POS system with sample data.
  
  Default Cashiers:
  - Abdi Hassan (ID: 001, PIN: 1234)
  - Fatima Ahmed (ID: 002, PIN: 5678)
  - Ali Mohamed (ID: 003, PIN: 9012)
  - Zainab Ibrahim (ID: 004, PIN: 3456)
*/

INSERT INTO cashiers (name, cashier_id, pin, is_active) VALUES
  ('Abdi Hassan', '001', '1234', true),
  ('Fatima Ahmed', '002', '5678', true),
  ('Ali Mohamed', '003', '9012', true),
  ('Zainab Ibrahim', '004', '3456', true)
ON CONFLICT (cashier_id) DO NOTHING;
