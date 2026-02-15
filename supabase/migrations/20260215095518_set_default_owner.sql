/*
  # Set Default Owner

  Makes the first default cashier (Abdi Hassan) an Owner so that the system
  has at least one Owner account ready for role management.

  1. Updates
    - Sets Abdi Hassan (cashier_id: 001) to Owner role
    - Ensures system has at least one Owner for managing roles
*/

UPDATE cashiers
SET role_id = (SELECT id FROM roles WHERE name = 'Owner' LIMIT 1)
WHERE cashier_id = '001';
