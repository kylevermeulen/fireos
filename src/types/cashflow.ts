// Cashflow transaction types based on uploaded CSV structure

export interface CashflowTransaction {
  date: Date;
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
  type: 'income' | 'L1' | 'L2';
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
