// Currency and classification types
export type CurrencyCode = 'AUD' | 'USD' | 'IDR';
export type LiquidityClass = 'liquid' | 'illiquid';
export type AccountType = 'cash' | 'investment' | 'retirement' | 'crypto' | 'offset';
export type LiabilityType = 'fixed_mortgage' | 'variable_mortgage' | 'loan';
export type AssetType = 'home' | 'business';
export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment_buy' | 'investment_sell' | 'dividends_interest' | 'fees' | 'tax';

// Account
export interface Account {
  id: string;
  user_id: string;
  name: string;
  institution: string;
  country: string;
  currency: CurrencyCode;
  account_type: AccountType;
  liquidity_class: LiquidityClass;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Balance snapshot
export interface Balance {
  id: string;
  account_id: string;
  balance_date: string;
  amount_native: number;
  amount_aud: number;
  created_at: string;
}

// Holding (shares/crypto)
export interface Holding {
  id: string;
  account_id: string;
  symbol: string;
  name: string | null;
  quantity: number;
  cost_basis_native: number;
  cost_basis_aud: number;
  created_at: string;
  updated_at: string;
}

// Asset price
export interface Price {
  id: string;
  symbol: string;
  price_date: string;
  price: number;
  currency: CurrencyCode;
  created_at: string;
}

// FX rate
export interface FxRate {
  id: string;
  rate_date: string;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: number;
  created_at: string;
}

// Valuation (home/business)
export interface Valuation {
  id: string;
  user_id: string;
  asset_type: AssetType;
  name: string;
  valuation_date: string;
  value_aud: number;
  notes: string | null;
  created_at: string;
}

// Liability
export interface Liability {
  id: string;
  user_id: string;
  name: string;
  liability_type: LiabilityType;
  institution: string | null;
  currency: CurrencyCode;
  original_amount: number | null;
  interest_rate: number;
  offset_account_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Liability balance
export interface LiabilityBalance {
  id: string;
  liability_id: string;
  balance_date: string;
  balance: number;
  created_at: string;
}

// Transaction
export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  transaction_date: string;
  amount_native: number;
  amount_aud: number;
  currency: CurrencyCode;
  description: string | null;
  merchant: string | null;
  category: string | null;
  transaction_type: TransactionType;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

// FIRE settings
export interface FireSettings {
  id: string;
  user_id: string;
  fire_multiple: number;
  include_retirement: boolean;
  include_offset: boolean;
  include_business: boolean;
  include_crypto: boolean;
  created_at: string;
  updated_at: string;
}

// Projection scenario
export interface ProjectionScenario {
  id: string;
  user_id: string;
  name: string;
  shares_return: number;
  crypto_return: number;
  inflation_rate: number;
  home_growth: number;
  business_growth: number;
  savings_override: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Aggregated wealth summary
export interface WealthSummary {
  totalNetWorth: number;
  liquidWealth: number;
  illiquidWealth: number;
  liquidNetWorth: number;
  liquidityPercent: number;
  totalCash: number;
  totalShares: number;
  totalCrypto: number;
  totalRetirement: number;
  totalRealEstate: number;
  totalBusiness: number;
  totalLiabilities: number;
  homeEquity: number;
}

// Cashflow summary
export interface CashflowSummary {
  thisMonthIncome: number;
  thisMonthSpend: number;
  thisMonthNet: number;
  lastMonthIncome: number;
  lastMonthSpend: number;
  lastMonthNet: number;
  rolling12Income: number;
  rolling12Spend: number;
  rolling12Net: number;
  savingsRateThisMonth: number;
  savingsRate12Month: number;
}

// FIRE calculations
export interface FireCalculations {
  annualSpend: number;
  fireNumber: number;
  investableAssets: number;
  fireProgress: number;
  fireRunway: number;
  projectedFireDate: string | null;
}
