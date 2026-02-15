# Setting Up Owner Role

If you need to assign the Owner role to a specific cashier, follow these steps:

## Option 1: Using SQL (Recommended for First Setup)

Run this SQL query in your Supabase SQL Editor to make a specific cashier an Owner:

```sql
-- Replace 'YOUR_CASHIER_NAME' with the actual name of the cashier
UPDATE cashiers
SET role_id = (SELECT id FROM roles WHERE name = 'Owner')
WHERE name = 'YOUR_CASHIER_NAME';
```

## Option 2: Using the Application

Once you have at least one Owner account set up:

1. Login as the Owner
2. Go to **Settings**
3. Scroll down to **Roles & Permissions** section
4. Click on the **User Assignments** tab
5. Select a user and assign them the **Owner** role

## Default Behavior

- All cashiers without a role are automatically assigned the **Cashier** role
- The menu now shows/hides based on user permissions
- While permissions are loading, all menu items are visible temporarily

## Checking Current Roles

To see all cashiers and their current roles:

```sql
SELECT
  c.name,
  c.cashier_id,
  r.name as role_name,
  r.level as role_level
FROM cashiers c
LEFT JOIN roles r ON c.role_id = r.id
WHERE c.is_active = true
ORDER BY r.level, c.name;
```
