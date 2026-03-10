import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  CashflowTransaction, 
  CategoryTotal, 
  CashflowMode,
  DateRange,
  DataSanityStats 
} from '@/types/cashflow';

async function fetchAllTransactions(userId: string, mode: CashflowMode): Promise<CashflowTransaction[]> {
  const BATCH = 1000;
  let from = 0;
  const all: CashflowTransaction[] = [];

  while (true) {
    let query = supabase
      .from('transactions')
      .select('transaction_date, source_account_name, counterparty, description, amount_native, currency, amount_aud, transaction_type, is_internal_transfer, l1_category, l2_category, is_synthetic')
      .eq('user_id', userId)
      .range(from, from + BATCH - 1);

    // Actual/cashflow mode: exclude synthetic rows
    if (mode === 'cashflow') {
      query = query.eq('is_synthetic', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      const date = new Date(row.transaction_date);
      if (isNaN(date.getTime())) continue;

      const amountAud = Number(row.amount_aud) || 0;
      const direction: 'in' | 'out' = 
        row.transaction_type === 'income' || row.transaction_type === 'dividends_interest' || amountAud > 0
          ? 'in' : 'out';

      all.push({
        date,
        source_account: row.source_account_name || '',
        counterparty: row.counterparty || '',
        description: row.description || '',
        amount_native: Number(row.amount_native) || 0,
        currency: row.currency || 'AUD',
        amount_aud: Math.abs(amountAud),
        direction,
        is_internal_transfer: row.is_internal_transfer ?? false,
        L1: row.l1_category || 'Unknown',
        L2: row.l2_category || 'Unknown',
      });
    }

    if (data.length < BATCH) break;
    from += BATCH;
  }

  return all;
}

export function useCashflowData(mode: CashflowMode = 'amortised') {
  const [rawTransactions, setRawTransactions] = useState<CashflowTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setRawTransactions([]);
        return;
      }
      const transactions = await fetchAllTransactions(session.user.id, mode);
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
      if (tx.date < dateRange.from || tx.date > dateRange.to) return false;
      if (l1Filter && tx.L1 !== l1Filter) return false;
      if (l2Filter && tx.L2 !== l2Filter) return false;
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

  const income = useMemo(() => 
    filtered.filter(tx => tx.direction === 'in' && tx.L1 === 'Income' && !tx.is_internal_transfer), 
    [filtered]
  );
  
  const spending = useMemo(() => 
    filtered.filter(tx => 
      tx.direction === 'out' && 
      !tx.is_internal_transfer && 
      tx.L1 !== 'Transfer — Internal'
    ), 
    [filtered]
  );

  const internalTransfers = useMemo(() =>
    filtered.filter(tx => tx.is_internal_transfer),
    [filtered]
  );

  const totalIncome = useMemo(() => income.reduce((sum, tx) => sum + tx.amount_aud, 0), [income]);
  const totalSpending = useMemo(() => spending.reduce((sum, tx) => sum + tx.amount_aud, 0), [spending]);
  const netPosition = useMemo(() => totalIncome - totalSpending, [totalIncome, totalSpending]);

  const incomeByCategory = useMemo((): CategoryTotal[] => {
    const map = new Map<string, { total: number; count: number; L1: string; L2: string }>();
    income.forEach(tx => {
      const key = tx.L2 !== 'Unknown' ? tx.L2 : tx.L1;
      const existing = map.get(key) || { total: 0, count: 0, L1: tx.L1, L2: tx.L2 };
      map.set(key, { total: existing.total + tx.amount_aud, count: existing.count + 1, L1: tx.L1, L2: tx.L2 });
    });
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, L1: data.L1, L2: data.L2, total: data.total, count: data.count, percentage: totalIncome > 0 ? data.total / totalIncome : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [income, totalIncome]);

  const spendingByCategory = useMemo((): CategoryTotal[] => {
    const map = new Map<string, { total: number; count: number; L1: string; L2: string }>();
    spending.forEach(tx => {
      const key = tx.L2 !== 'Unknown' ? tx.L2 : tx.L1;
      const existing = map.get(key) || { total: 0, count: 0, L1: tx.L1, L2: tx.L2 };
      map.set(key, { total: existing.total + tx.amount_aud, count: existing.count + 1, L1: tx.L1, L2: tx.L2 });
    });
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, L1: data.L1, L2: data.L2, total: data.total, count: data.count, percentage: totalSpending > 0 ? data.total / totalSpending : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [spending, totalSpending]);

  const spendingByL1 = useMemo((): CategoryTotal[] => {
    const map = new Map<string, { total: number; count: number }>();
    spending.forEach(tx => {
      const existing = map.get(tx.L1) || { total: 0, count: 0 };
      map.set(tx.L1, { total: existing.total + tx.amount_aud, count: existing.count + 1 });
    });
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, L1: category, L2: '', total: data.total, count: data.count, percentage: totalSpending > 0 ? data.total / totalSpending : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [spending, totalSpending]);

  const L1_DISPLAY_ORDER = [
    'Food Delivery & Taxi', 'Restaurants, Cafes & Bars', 'Groceries', 'Mortgage', 'Rent',
    'Utilities & Bills', 'Household', 'School Fees', 'Family', 'Personal Care', 'Shopping',
    'Health & Fitness', 'Entertainment', 'Subscriptions', 'Travel', 'Ntegrity', 'Income',
    'Investing', 'Insurance', 'Donations', 'Taxes & Govt Fees', 'Professional Services',
    'Transfer — Internal', 'Indonesia — Uncategorised', 'Australia — Uncategorised', 'Uncategorised',
  ];

  const allL1Categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tx => { if (tx.L1) set.add(tx.L1); });
    return Array.from(set).sort((a, b) => {
      const ai = L1_DISPLAY_ORDER.indexOf(a);
      const bi = L1_DISPLAY_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [transactions]);

  const allL2Categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tx => { if (tx.L2) set.add(tx.L2); });
    return Array.from(set).sort();
  }, [transactions]);

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
