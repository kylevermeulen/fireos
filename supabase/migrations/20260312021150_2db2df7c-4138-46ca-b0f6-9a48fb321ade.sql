
-- Add unique constraints needed for ON CONFLICT clauses
CREATE UNIQUE INDEX IF NOT EXISTS idx_balances_account_date ON public.balances (account_id, balance_date);
