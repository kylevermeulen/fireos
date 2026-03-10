// Cashflow transaction types based on uploaded CSV structure

export type CashflowMode = 'accrual' | 'cash';

export interface CashflowTransaction {
  id: string;
  date: Date;
  /** Original transaction_date, always preserved */
  transaction_date: Date;
  /** If effective_date was set, stored here */
  effective_date: Date | null;
  source_account: string;
  counterparty: string;
  description: string;
  amount_native: number;
  currency: string;
  amount_aud: number;
  direction: 'in' | 'out';
  is_internal_transfer: boolean;
  L1: string;
  L2: string;
}

export interface CategoryTotal {
  category: string;
  L1: string;
  L2: string;
  total: number;
  count: number;
  percentage: number;
}

export interface SankeyNode {
  name: string;
  type: 'source_account' | 'L1' | 'L2' | 'counterparty';
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export type CashflowTimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface CashflowFiltersState {
  mode: CashflowMode;
  dateRange: DateRange;
  l1Filter: string | null;
  l2Filter: string | null;
  searchQuery: string;
}

export interface DataSanityStats {
  totalIncome: number;
  totalExternalSpend: number;
  totalInternalTransfersExcluded: number;
  rowCount: number;
}
