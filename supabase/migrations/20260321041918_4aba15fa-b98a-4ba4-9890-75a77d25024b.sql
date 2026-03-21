
-- Rename existing Permata to Permata Kyle
UPDATE accounts SET name = 'Permata Kyle' WHERE name = 'Permata';

-- Insert Permata Richenda (copy settings from Permata Kyle)
INSERT INTO accounts (user_id, name, institution, country, currency, account_type, liquidity_class)
SELECT user_id, 'Permata Richenda', institution, country, currency, account_type, liquidity_class
FROM accounts WHERE name = 'Permata Kyle'
LIMIT 1;

-- Update the unique constraint will be satisfied since we changed the name
