/*
  # Ensure All Cashiers Have Roles

  This migration ensures that all active cashiers have a role assigned.
  Any cashier without a role will be assigned the default 'Cashier' role.

  1. Updates
    - Sets role_id to 'Cashier' role for any cashier with NULL role_id
    - Ensures all users can access the system
*/

UPDATE cashiers
SET role_id = (SELECT id FROM roles WHERE name = 'Cashier' LIMIT 1)
WHERE role_id IS NULL AND is_active = true;
