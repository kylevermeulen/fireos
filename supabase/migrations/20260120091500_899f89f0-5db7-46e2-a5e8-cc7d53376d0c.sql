-- Create enums
CREATE TYPE public.currency_code AS ENUM ('AUD', 'USD', 'IDR');
CREATE TYPE public.liquidity_class AS ENUM ('liquid', 'illiquid');
CREATE TYPE public.account_type AS ENUM ('cash', 'investment', 'retirement', 'crypto', 'offset');
CREATE TYPE public.liability_type AS ENUM ('fixed_mortgage', 'variable_mortgage', 'loan');
CREATE TYPE public.asset_type AS ENUM ('home', 'business');
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense', 'transfer', 'investment_buy', 'investment_sell', 'dividends_interest', 'fees', 'tax');

-- Accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  institution TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'AU',
  currency currency_code NOT NULL DEFAULT 'AUD',
  account_type account_type NOT NULL DEFAULT 'cash',
  liquidity_class liquidity_class NOT NULL DEFAULT 'liquid',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Balances history (monthly/daily snapshots)
CREATE TABLE public.balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  balance_date DATE NOT NULL,
  amount_native NUMERIC(18, 2) NOT NULL,
  amount_aud NUMERIC(18, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, balance_date)
);

-- Holdings for shares/crypto
CREATE TABLE public.holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT,
  quantity NUMERIC(18, 8) NOT NULL DEFAULT 0,
  cost_basis_native NUMERIC(18, 2) DEFAULT 0,
  cost_basis_aud NUMERIC(18, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, symbol)
);

-- Asset prices (shares, crypto, etc.)
CREATE TABLE public.prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  price_date DATE NOT NULL,
  price NUMERIC(18, 8) NOT NULL,
  currency currency_code NOT NULL DEFAULT 'AUD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(symbol, price_date)
);

-- FX rates
CREATE TABLE public.fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_date DATE NOT NULL,
  from_currency currency_code NOT NULL,
  to_currency currency_code NOT NULL,
  rate NUMERIC(18, 8) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rate_date, from_currency, to_currency)
);

-- Valuations (home, business - manual quarterly updates)
CREATE TABLE public.valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  asset_type asset_type NOT NULL,
  name TEXT NOT NULL,
  valuation_date DATE NOT NULL,
  value_aud NUMERIC(18, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Liabilities (mortgages, loans)
CREATE TABLE public.liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  liability_type liability_type NOT NULL,
  institution TEXT,
  currency currency_code NOT NULL DEFAULT 'AUD',
  original_amount NUMERIC(18, 2),
  interest_rate NUMERIC(5, 4) DEFAULT 0,
  offset_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Liability balances (history)
CREATE TABLE public.liability_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liability_id UUID NOT NULL REFERENCES public.liabilities(id) ON DELETE CASCADE,
  balance_date DATE NOT NULL,
  balance NUMERIC(18, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(liability_id, balance_date)
);

-- Transactions for cashflow tracking
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  amount_native NUMERIC(18, 2) NOT NULL,
  amount_aud NUMERIC(18, 2) NOT NULL,
  currency currency_code NOT NULL DEFAULT 'AUD',
  description TEXT,
  merchant TEXT,
  category TEXT,
  transaction_type transaction_type NOT NULL DEFAULT 'expense',
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FIRE settings
CREATE TABLE public.fire_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  fire_multiple NUMERIC(4, 1) NOT NULL DEFAULT 25,
  include_retirement BOOLEAN NOT NULL DEFAULT false,
  include_offset BOOLEAN NOT NULL DEFAULT true,
  include_business BOOLEAN NOT NULL DEFAULT false,
  include_crypto BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projection scenarios
CREATE TABLE public.projection_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  shares_return NUMERIC(5, 4) NOT NULL DEFAULT 0.07,
  crypto_return NUMERIC(5, 4) NOT NULL DEFAULT 0.10,
  inflation_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.03,
  home_growth NUMERIC(5, 4) NOT NULL DEFAULT 0.04,
  business_growth NUMERIC(5, 4) NOT NULL DEFAULT 0.05,
  savings_override NUMERIC(18, 2),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper function to check account ownership
CREATE OR REPLACE FUNCTION public.is_account_owner(account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = account_id AND user_id = auth.uid()
  )
$$;

-- Helper function to check liability ownership
CREATE OR REPLACE FUNCTION public.is_liability_owner(liability_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.liabilities
    WHERE id = liability_id AND user_id = auth.uid()
  )
$$;

-- Enable RLS on all tables
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liability_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fire_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projection_scenarios ENABLE ROW LEVEL SECURITY;

-- RLS policies for accounts
CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE USING (user_id = auth.uid());

-- RLS policies for balances (via account ownership)
CREATE POLICY "Users can view own balances" ON public.balances FOR SELECT USING (public.is_account_owner(account_id));
CREATE POLICY "Users can insert own balances" ON public.balances FOR INSERT WITH CHECK (public.is_account_owner(account_id));
CREATE POLICY "Users can update own balances" ON public.balances FOR UPDATE USING (public.is_account_owner(account_id));
CREATE POLICY "Users can delete own balances" ON public.balances FOR DELETE USING (public.is_account_owner(account_id));

-- RLS policies for holdings (via account ownership)
CREATE POLICY "Users can view own holdings" ON public.holdings FOR SELECT USING (public.is_account_owner(account_id));
CREATE POLICY "Users can insert own holdings" ON public.holdings FOR INSERT WITH CHECK (public.is_account_owner(account_id));
CREATE POLICY "Users can update own holdings" ON public.holdings FOR UPDATE USING (public.is_account_owner(account_id));
CREATE POLICY "Users can delete own holdings" ON public.holdings FOR DELETE USING (public.is_account_owner(account_id));

-- RLS policies for prices (read-only for all authenticated, insert via service role)
CREATE POLICY "Authenticated users can view prices" ON public.prices FOR SELECT TO authenticated USING (true);

-- RLS policies for fx_rates (read-only for all authenticated)
CREATE POLICY "Authenticated users can view fx_rates" ON public.fx_rates FOR SELECT TO authenticated USING (true);

-- RLS policies for valuations
CREATE POLICY "Users can view own valuations" ON public.valuations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own valuations" ON public.valuations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own valuations" ON public.valuations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own valuations" ON public.valuations FOR DELETE USING (user_id = auth.uid());

-- RLS policies for liabilities
CREATE POLICY "Users can view own liabilities" ON public.liabilities FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own liabilities" ON public.liabilities FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own liabilities" ON public.liabilities FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own liabilities" ON public.liabilities FOR DELETE USING (user_id = auth.uid());

-- RLS policies for liability_balances (via liability ownership)
CREATE POLICY "Users can view own liability_balances" ON public.liability_balances FOR SELECT USING (public.is_liability_owner(liability_id));
CREATE POLICY "Users can insert own liability_balances" ON public.liability_balances FOR INSERT WITH CHECK (public.is_liability_owner(liability_id));
CREATE POLICY "Users can update own liability_balances" ON public.liability_balances FOR UPDATE USING (public.is_liability_owner(liability_id));
CREATE POLICY "Users can delete own liability_balances" ON public.liability_balances FOR DELETE USING (public.is_liability_owner(liability_id));

-- RLS policies for transactions
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (user_id = auth.uid());

-- RLS policies for fire_settings
CREATE POLICY "Users can view own fire_settings" ON public.fire_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own fire_settings" ON public.fire_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own fire_settings" ON public.fire_settings FOR UPDATE USING (user_id = auth.uid());

-- RLS policies for projection_scenarios
CREATE POLICY "Users can view own scenarios" ON public.projection_scenarios FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own scenarios" ON public.projection_scenarios FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own scenarios" ON public.projection_scenarios FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own scenarios" ON public.projection_scenarios FOR DELETE USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_balances_account_date ON public.balances(account_id, balance_date DESC);
CREATE INDEX idx_holdings_account ON public.holdings(account_id);
CREATE INDEX idx_prices_symbol_date ON public.prices(symbol, price_date DESC);
CREATE INDEX idx_fx_rates_date ON public.fx_rates(rate_date DESC);
CREATE INDEX idx_valuations_user_date ON public.valuations(user_id, valuation_date DESC);
CREATE INDEX idx_liabilities_user ON public.liabilities(user_id);
CREATE INDEX idx_liability_balances_date ON public.liability_balances(liability_id, balance_date DESC);
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);

-- Timestamp update trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply timestamp triggers
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON public.holdings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_liabilities_updated_at BEFORE UPDATE ON public.liabilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fire_settings_updated_at BEFORE UPDATE ON public.fire_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projection_scenarios_updated_at BEFORE UPDATE ON public.projection_scenarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();