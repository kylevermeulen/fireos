-- Move balances from new duplicate accounts to the correct existing accounts
-- then delete the duplicates

-- First, let's identify and move balances from renamed accounts to the correct existing accounts
-- Using CTEs to avoid subquery issues

WITH kyle_old AS (SELECT id FROM accounts WHERE name = 'Kyle: Australian Super' LIMIT 1),
     kyle_new AS (SELECT id FROM accounts WHERE name = 'AustralianSuper: Kyle' LIMIT 1)
UPDATE balances SET account_id = kyle_new.id
FROM kyle_old, kyle_new
WHERE balances.account_id = kyle_old.id;

WITH richenda_old AS (SELECT id FROM accounts WHERE name = 'Richenda: Australian Super' LIMIT 1),
     richenda_new AS (SELECT id FROM accounts WHERE name = 'AustralianSuper: Richenda' LIMIT 1)
UPDATE balances SET account_id = richenda_new.id
FROM richenda_old, richenda_new
WHERE balances.account_id = richenda_old.id;

WITH commsec_old AS (SELECT id FROM accounts WHERE name = 'CommSec' LIMIT 1),
     commsec_new AS (SELECT id FROM accounts WHERE name = 'CommSec Shares' LIMIT 1)
UPDATE balances SET account_id = commsec_new.id
FROM commsec_old, commsec_new
WHERE balances.account_id = commsec_old.id;

WITH vanguard_old AS (SELECT id FROM accounts WHERE name = 'Vanguard 403b' LIMIT 1),
     vanguard_new AS (SELECT id FROM accounts WHERE name = 'Vanguard' LIMIT 1)
UPDATE balances SET account_id = vanguard_new.id
FROM vanguard_old, vanguard_new
WHERE balances.account_id = vanguard_old.id;

WITH jp_old AS (SELECT id FROM accounts WHERE name = 'JP Morgan Investment' LIMIT 1),
     jp_new AS (SELECT id FROM accounts WHERE name = 'RWBaird' LIMIT 1)
UPDATE balances SET account_id = jp_new.id
FROM jp_old, jp_new
WHERE balances.account_id = jp_old.id;

-- Delete balances for accounts that will be deleted (orphaned balance cleanup)
DELETE FROM balances WHERE account_id IN (
  SELECT id FROM accounts WHERE name IN (
    'Kyle: Australian Super',
    'Richenda: Australian Super',
    'CommSec',
    'Vanguard 403b',
    'JP Morgan Investment'
  )
);

-- Delete the renamed duplicate accounts
DELETE FROM accounts WHERE name IN (
  'Kyle: Australian Super',
  'Richenda: Australian Super',
  'CommSec',
  'Vanguard 403b',
  'JP Morgan Investment'
);

-- For same-name duplicates, keep the one with the earliest created_at and delete others
-- Using a CTE to identify duplicates to keep
WITH accounts_to_keep AS (
  SELECT DISTINCT ON (name) id, name, created_at
  FROM accounts
  WHERE name IN ('Chase: Savings','Chase: Checking','Wealthfront: Roth','CommBank: Savings','CoinJar','Coinbase','Permata','Trust Bank Accounts','Wealthfront: Personal','Bank of Melbourne: Offset')
  ORDER BY name, created_at ASC, id ASC
)
DELETE FROM accounts
WHERE name IN ('Chase: Savings','Chase: Checking','Wealthfront: Roth','CommBank: Savings','CoinJar','Coinbase','Permata','Trust Bank Accounts','Wealthfront: Personal','Bank of Melbourne: Offset')
AND id NOT IN (SELECT id FROM accounts_to_keep);

-- Add unique constraint to prevent this happening again
ALTER TABLE accounts ADD CONSTRAINT accounts_name_unique UNIQUE (name);