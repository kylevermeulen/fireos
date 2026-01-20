-- Add unique constraints for idempotent upserts
-- Balances: unique per account per date
ALTER TABLE public.balances 
ADD CONSTRAINT balances_account_date_unique UNIQUE (account_id, balance_date);

-- Liability balances: unique per liability per date
ALTER TABLE public.liability_balances 
ADD CONSTRAINT liability_balances_liability_date_unique UNIQUE (liability_id, balance_date);

-- FX rates: unique per currency pair per date
ALTER TABLE public.fx_rates 
ADD CONSTRAINT fx_rates_pair_date_unique UNIQUE (from_currency, to_currency, rate_date);

-- Valuations: unique per asset name per date (since we track home/business by name)
ALTER TABLE public.valuations 
ADD CONSTRAINT valuations_name_date_unique UNIQUE (user_id, name, valuation_date);