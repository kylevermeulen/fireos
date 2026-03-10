import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CashflowTransaction, 
  CategoryTotal, 
  CashflowMode,
  DateRange,
  DataSanityStats 
} from '@/types/cashflow';

// Wise rent prepaid keywords for automatic categorization
const WISE_RENT_KEYWORDS = [
  'LISA MICHELLE CROSBY',
  'ADYATAMA',
  'BALIMOVES',
  'INVOICE 001',
];

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try yyyy-mm-dd format first
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  
  // Try dd/mm/yyyy format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  return null;
}

function parseNumber(value: string | number): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

function parseBoolean(value: string): boolean {
  if (!value) return false;
  return value.toLowerCase() === 'true';
}

function applyWiseRentFix(tx: CashflowTransaction): CashflowTransaction {
  // Check if source_account contains "Wise"
  if (!tx.source_account?.toLowerCase().includes('wise')) {
    return tx;
  }
  
  // Check if counterparty or description contains any of the keywords
  const searchText = `${tx.counterparty || ''} ${tx.description || ''}`.toUpperCase();
  const matchesKeyword = WISE_RENT_KEYWORDS.some(kw => searchText.includes(kw.toUpperCase()));
  
  if (matchesKeyword) {
    return {
      ...tx,
      L1: 'Indonesia Rent',
      L2: 'Indonesia Rent (Prepaid)',
    };
  }
  
  return tx;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

async function loadCsvData(filePath: string): Promise<CashflowTransaction[]> {
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`Failed to load ${filePath}`);
  }
  
  const csvContent = await response.text();
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return [];
  }
  
  const transactions: CashflowTransaction[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < 11) continue;
    
    const [date, source_account, counterparty, description, amount_native, currency, amount_aud, direction, is_internal_transfer, L1, L2] = values;
    
    const parsedDate = parseDate(date);
    const parsedAmountAud = parseNumber(amount_aud);
    
    // Skip rows with no valid amount_aud
    if (!parsedDate || parsedAmountAud === null) continue;
    
    let tx: CashflowTransaction = {
      date: parsedDate,
      source_account: source_account || '',
      counterparty: counterparty || '',
      description: description || '',
      amount_native: parseNumber(amount_native) || 0,
      currency: currency || 'AUD',
      amount_aud: parsedAmountAud,
      direction: direction === 'in' ? 'in' : 'out',
      is_internal_transfer: parseBoolean(is_internal_transfer),
      L1: L1 || '',
      L2: L2 || '',
    };
    
    // Apply Wise rent fix
    tx = applyWiseRentFix(tx);
    
    // Set Unknown for empty categories
    if (!tx.L1) tx.L1 = 'Unknown';
    if (!tx.L2) tx.L2 = 'Unknown';
    
    transactions.push(tx);
  }
  
  return transactions;
}

const CSV_PATHS: Record<CashflowMode, string> = {
  amortised: '/data/cashflow_accrual.csv',
  cashflow: '/data/cashflow_actual.csv',
};

export function useCashflowData(mode: CashflowMode = 'amortised') {
  const [rawTransactions, setRawTransactions] = useState<CashflowTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const transactions = await loadCsvData(CSV_PATHS[mode]);
      setRawTransactions(transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { rawTransactions, isLoading, error, reload: loadData };
}

export function useFilteredCashflow(
  transactions: CashflowTransaction[],
  dateRange: DateRange,
  l1Filter: string | null = null,
  l2Filter: string | null = null,
  searchQuery: string = ''
) {
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      // Date range filter
      if (tx.date < dateRange.from || tx.date > dateRange.to) return false;
      
      // L1 filter
      if (l1Filter && tx.L1 !== l1Filter) return false;
      
      // L2 filter
      if (l2Filter && tx.L2 !== l2Filter) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          tx.counterparty.toLowerCase().includes(query) ||
          tx.description.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [transactions, dateRange, l1Filter, l2Filter, searchQuery]);

  // Income: direction=in AND L1='Income' AND NOT internal transfer
  const income = useMemo(() => 
    filtered.filter(tx => tx.direction === 'in' && tx.L1 === 'Income' && !tx.is_internal_transfer), 
    [filtered]
  );
  
  // External spending: direction=out AND NOT internal transfer
  const spending = useMemo(() => 
    filtered.filter(tx => tx.direction === 'out' && !tx.is_internal_transfer), 
    [filtered]
  );

  // Internal transfers (for sanity stats)
  const internalTransfers = useMemo(() =>
    filtered.filter(tx => tx.is_internal_transfer),
    [filtered]
  );

  const totalIncome = useMemo(() => income.reduce((sum, tx) => sum + tx.amount_aud, 0), [income]);
  const totalSpending = useMemo(() => spending.reduce((sum, tx) => sum + tx.amount_aud, 0), [spending]);
  const netPosition = useMemo(() => totalIncome - totalSpending, [totalIncome, totalSpending]);

  // Income by L2
  const incomeByCategory = useMemo((): CategoryTotal[] => {
    const map = new Map<string, { total: number; count: number; L1: string; L2: string }>();
    
    income.forEach(tx => {
      const key = tx.L2 !== 'Unknown' ? tx.L2 : tx.L1;
      const existing = map.get(key) || { total: 0, count: 0, L1: tx.L1, L2: tx.L2 };
      map.set(key, {
        total: existing.total + tx.amount_aud,
        count: existing.count + 1,
        L1: tx.L1,
        L2: tx.L2,
      });
    });
    
    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        L1: data.L1,
        L2: data.L2,
        total: data.total,
        count: data.count,
        percentage: totalIncome > 0 ? data.total / totalIncome : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [income, totalIncome]);

  // Spending by L2 (for table display)
  const spendingByCategory = useMemo((): CategoryTotal[] => {
    const map = new Map<string, { total: number; count: number; L1: string; L2: string }>();
    
    spending.forEach(tx => {
      const key = tx.L2 !== 'Unknown' ? tx.L2 : tx.L1;
      const existing = map.get(key) || { total: 0, count: 0, L1: tx.L1, L2: tx.L2 };
      map.set(key, {
        total: existing.total + tx.amount_aud,
        count: existing.count + 1,
        L1: tx.L1,
        L2: tx.L2,
      });
    });
    
    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        L1: data.L1,
        L2: data.L2,
        total: data.total,
        count: data.count,
        percentage: totalSpending > 0 ? data.total / totalSpending : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [spending, totalSpending]);

  // Spending by L1 (for Sankey)
  const spendingByL1 = useMemo((): CategoryTotal[] => {
    const map = new Map<string, { total: number; count: number }>();
    
    spending.forEach(tx => {
      const existing = map.get(tx.L1) || { total: 0, count: 0 };
      map.set(tx.L1, {
        total: existing.total + tx.amount_aud,
        count: existing.count + 1,
      });
    });
    
    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        L1: category,
        L2: '',
        total: data.total,
        count: data.count,
        percentage: totalSpending > 0 ? data.total / totalSpending : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [spending, totalSpending]);

  // All unique L1 categories — sorted by canonical display order
  const allL1Categories = useMemo(() => {
    const L1_DISPLAY_ORDER = [
      'Food Delivery & Taxi', 'Restaurants, Cafes & Bars', 'Groceries', 'Mortgage', 'Rent',
      'Utilities & Bills', 'Household', 'School Fees', 'Family', 'Personal Care', 'Shopping',
      'Health & Fitness', 'Entertainment', 'Subscriptions', 'Travel', 'Ntegrity', 'Income',
      'Investing', 'Insurance', 'Donations', 'Taxes & Govt Fees', 'Professional Services',
      'Transfer — Internal', 'Indonesia — Uncategorised', 'Australia — Uncategorised', 'Uncategorised',
    ];
    const set = new Set<string>();
    transactions.forEach(tx => {
      if (tx.L1) set.add(tx.L1);
    });
    return Array.from(set).sort((a, b) => {
      const ai = L1_DISPLAY_ORDER.indexOf(a);
      const bi = L1_DISPLAY_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [transactions]);

  // All unique L2 categories
  const allL2Categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tx => {
      if (tx.L2) set.add(tx.L2);
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Data sanity stats
  const sanityStats = useMemo((): DataSanityStats => ({
    totalIncome,
    totalExternalSpend: totalSpending,
    totalInternalTransfersExcluded: internalTransfers.reduce((sum, tx) => sum + tx.amount_aud, 0),
    rowCount: filtered.length,
  }), [totalIncome, totalSpending, internalTransfers, filtered.length]);

  return {
    filtered,
    income,
    spending,
    totalIncome,
    totalSpending,
    netPosition,
    incomeByCategory,
    spendingByCategory,
    spendingByL1,
    allL1Categories,
    allL2Categories,
    sanityStats,
  };
}
