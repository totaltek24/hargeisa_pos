/*
  # Create Roles and Permissions System

  1. New Tables
    - `roles`
      - `id` (uuid, primary key)
      - `name` (text) - Role name (Owner, Manager, Cashier, etc.)
      - `description` (text) - Role description
      - `level` (integer) - Hierarchy level (1=Owner, 2=Manager, 3=Cashier, etc.)
      - `created_at` (timestamptz)
      
    - `permissions`
      - `id` (uuid, primary key)
      - `name` (text) - Permission identifier (e.g., 'view_reports', 'manage_inventory')
      - `display_name` (text) - Human-readable name
      - `category` (text) - Category (e.g., 'Sales', 'Inventory', 'Settings')
      - `description` (text)
      - `created_at` (timestamptz)
      
    - `role_permissions`
      - `id` (uuid, primary key)
      - `role_id` (uuid, foreign key to roles)
      - `permission_id` (uuid, foreign key to permissions)
      - `created_at` (timestamptz)
      
  2. Changes
    - Add `role_id` to `cashiers` table
    - Add `custom_permissions` jsonb field to cashiers for overrides
    
  3. Security
    - Enable RLS on all tables
    - Owners can manage everything
    - Managers can view and manage within their permissions
    - Cashiers can only view their own data
    
  4. Seed Data
    - Insert default roles (Owner, Manager, Cashier)
    - Insert all available permissions
    - Set up default role permissions
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  level integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Add role_id to cashiers table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cashiers' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE cashiers ADD COLUMN role_id uuid REFERENCES roles(id);
  END IF;
END $$;

-- Add custom_permissions to cashiers for individual permission overrides
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cashiers' AND column_name = 'custom_permissions'
  ) THEN
    ALTER TABLE cashiers ADD COLUMN custom_permissions jsonb DEFAULT '{"granted": [], "revoked": []}'::jsonb;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles
CREATE POLICY "Anyone can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only owners can manage roles"
  ON roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cashiers
      JOIN roles ON cashiers.role_id = roles.id
      WHERE cashiers.id = auth.uid()
      AND roles.level = 1
    )
  );

-- RLS Policies for permissions
CREATE POLICY "Anyone can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only owners can manage permissions"
  ON permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cashiers
      JOIN roles ON cashiers.role_id = roles.id
      WHERE cashiers.id = auth.uid()
      AND roles.level = 1
    )
  );

-- RLS Policies for role_permissions
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only owners can manage role permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cashiers
      JOIN roles ON cashiers.role_id = roles.id
      WHERE cashiers.id = auth.uid()
      AND roles.level = 1
    )
  );

-- Insert default roles
INSERT INTO roles (name, description, level) VALUES
  ('Owner', 'Full system access and control', 1),
  ('Manager', 'Can manage operations and view all reports', 2),
  ('Cashier', 'Basic sales and transaction operations', 3),
  ('Inventory Manager', 'Manage inventory, products, and suppliers', 2),
  ('Accountant', 'View reports, manage expenses and taxes', 2)
ON CONFLICT (name) DO NOTHING;

-- Insert all available permissions
INSERT INTO permissions (name, display_name, category, description) VALUES
  -- Sales permissions
  ('make_sales', 'Make Sales', 'Sales', 'Process sales transactions'),
  ('void_transactions', 'Void Transactions', 'Sales', 'Void or cancel sales transactions'),
  ('apply_discounts', 'Apply Discounts', 'Sales', 'Apply discounts to sales'),
  ('process_refunds', 'Process Refunds', 'Sales', 'Process customer refunds'),
  ('view_transaction_history', 'View Transaction History', 'Sales', 'View past transactions'),
  
  -- Inventory permissions
  ('view_inventory', 'View Inventory', 'Inventory', 'View product inventory'),
  ('manage_inventory', 'Manage Inventory', 'Inventory', 'Add, edit, and delete products'),
  ('adjust_stock', 'Adjust Stock', 'Inventory', 'Make inventory adjustments'),
  ('view_low_stock', 'View Low Stock Alerts', 'Inventory', 'View low stock notifications'),
  
  -- Customer permissions
  ('view_customers', 'View Customers', 'Customers', 'View customer information'),
  ('manage_customers', 'Manage Customers', 'Customers', 'Add, edit, and delete customers'),
  ('manage_loyalty', 'Manage Loyalty Program', 'Customers', 'Manage loyalty rewards and points'),
  
  -- Reports permissions
  ('view_sales_reports', 'View Sales Reports', 'Reports', 'View sales analytics and reports'),
  ('view_inventory_reports', 'View Inventory Reports', 'Reports', 'View inventory reports'),
  ('view_employee_reports', 'View Employee Reports', 'Reports', 'View employee performance reports'),
  ('export_reports', 'Export Reports', 'Reports', 'Export reports to file'),
  
  -- Financial permissions
  ('view_expenses', 'View Expenses', 'Finance', 'View expense records'),
  ('manage_expenses', 'Manage Expenses', 'Finance', 'Add and manage expenses'),
  ('view_taxes', 'View Tax Payments', 'Finance', 'View tax payment records'),
  ('manage_taxes', 'Manage Tax Payments', 'Finance', 'Record and manage tax payments'),
  ('open_cash_drawer', 'Open Cash Drawer', 'Finance', 'Manually open cash drawer'),
  
  -- Employee permissions
  ('view_employees', 'View Employees', 'Employees', 'View employee information'),
  ('manage_employees', 'Manage Employees', 'Employees', 'Add, edit, and delete employees'),
  ('manage_time_clock', 'Manage Time Clock', 'Employees', 'Clock in/out and view time entries'),
  ('view_employee_time', 'View Employee Time', 'Employees', 'View all employee time entries'),
  
  -- Settings permissions
  ('view_settings', 'View Settings', 'Settings', 'View system settings'),
  ('manage_settings', 'Manage Settings', 'Settings', 'Modify system settings'),
  ('manage_roles', 'Manage Roles & Permissions', 'Settings', 'Create and manage user roles'),
  ('manage_payment_methods', 'Manage Payment Methods', 'Settings', 'Configure payment methods'),
  ('manage_integrations', 'Manage Integrations', 'Settings', 'Configure third-party integrations')
ON CONFLICT (name) DO NOTHING;

-- Set up default permissions for Owner role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Owner'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Set up default permissions for Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager'
AND p.name IN (
  'make_sales', 'void_transactions', 'apply_discounts', 'process_refunds', 'view_transaction_history',
  'view_inventory', 'manage_inventory', 'adjust_stock', 'view_low_stock',
  'view_customers', 'manage_customers', 'manage_loyalty',
  'view_sales_reports', 'view_inventory_reports', 'view_employee_reports', 'export_reports',
  'view_expenses', 'manage_expenses', 'view_taxes', 'open_cash_drawer',
  'view_employees', 'manage_time_clock', 'view_employee_time',
  'view_settings'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Set up default permissions for Cashier role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Cashier'
AND p.name IN (
  'make_sales', 'apply_discounts', 'view_transaction_history',
  'view_inventory', 'view_low_stock',
  'view_customers', 'manage_loyalty',
  'manage_time_clock'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Set up default permissions for Inventory Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Inventory Manager'
AND p.name IN (
  'view_inventory', 'manage_inventory', 'adjust_stock', 'view_low_stock',
  'view_inventory_reports', 'export_reports',
  'view_settings'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Set up default permissions for Accountant role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Accountant'
AND p.name IN (
  'view_transaction_history',
  'view_sales_reports', 'view_inventory_reports', 'view_employee_reports', 'export_reports',
  'view_expenses', 'manage_expenses', 'view_taxes', 'manage_taxes',
  'view_settings'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Update existing default cashiers to have Cashier role
UPDATE cashiers
SET role_id = (SELECT id FROM roles WHERE name = 'Cashier')
WHERE role_id IS NULL;
