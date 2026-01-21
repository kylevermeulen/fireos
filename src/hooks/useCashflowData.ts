import { useState, useEffect, useMemo, useCallback } from 'react';
import { CashflowTransaction, CategoryTotal, SankeyData, CashflowTimeRange } from '@/types/cashflow';

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

export function useCashflowData() {
  const [rawTransactions, setRawTransactions] = useState<CashflowTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/data/cashflow_transactions.csv');
      if (!response.ok) {
        throw new Error('Failed to load cashflow data');
      }
      
      const csvContent = await response.text();
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setRawTransactions([]);
        return;
      }
      
      // Skip header
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
          is_internal_transfer: is_internal_transfer?.toLowerCase() === 'true',
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
      
      setRawTransactions(transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { rawTransactions, isLoading, error, reload: loadData };
}

export function useFilteredCashflow(
  transactions: CashflowTransaction[],
  timeRange: CashflowTimeRange,
  excludeInternalTransfers: boolean,
  showUnknown: boolean
) {
  const filtered = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date(now);
    
    switch (timeRange) {
      case '1M':
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        break;
      case '3M':
        cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        break;
      case '6M':
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        break;
      case '1Y':
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        break;
      case 'ALL':
      default:
        cutoffDate.setFullYear(2000); // Include all
    }
    
    return transactions.filter(tx => {
      // Time range filter
      if (tx.date < cutoffDate) return false;
      
      // Internal transfers filter
      if (excludeInternalTransfers && tx.is_internal_transfer) return false;
      
      // Unknown filter
      if (!showUnknown && tx.L1 === 'Unknown') return false;
      
      return true;
    });
  }, [transactions, timeRange, excludeInternalTransfers, showUnknown]);

  // Income: direction=in AND L1='Income' (per CSV ground truth requirements)
  const income = useMemo(() => filtered.filter(tx => tx.direction === 'in' && tx.L1 === 'Income'), [filtered]);
  const spending = useMemo(() => filtered.filter(tx => tx.direction === 'out'), [filtered]);

  const totalIncome = useMemo(() => income.reduce((sum, tx) => sum + tx.amount_aud, 0), [income]);
  const totalSpending = useMemo(() => spending.reduce((sum, tx) => sum + tx.amount_aud, 0), [spending]);
  const netPosition = useMemo(() => totalIncome - totalSpending, [totalIncome, totalSpending]);

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

  // Build Sankey data
  const sankeyData = useMemo((): SankeyData => {
    const nodes: { name: string; type: 'income' | 'L1' | 'L2' }[] = [];
    const nodeIndexMap = new Map<string, number>();
    
    // Helper to add node if not exists
    const addNode = (name: string, type: 'income' | 'L1' | 'L2'): number => {
      const key = `${type}:${name}`;
      if (nodeIndexMap.has(key)) {
        return nodeIndexMap.get(key)!;
      }
      const index = nodes.length;
      nodes.push({ name, type });
      nodeIndexMap.set(key, index);
      return index;
    };
    
    // Build income category totals
    const incomeTotals = new Map<string, number>();
    income.forEach(tx => {
      const cat = tx.L2 !== 'Unknown' ? tx.L2 : tx.L1;
      incomeTotals.set(cat, (incomeTotals.get(cat) || 0) + tx.amount_aud);
    });
    
    // Build L1 spending totals
    const l1Totals = new Map<string, number>();
    spending.forEach(tx => {
      l1Totals.set(tx.L1, (l1Totals.get(tx.L1) || 0) + tx.amount_aud);
    });
    
    // Create links: Income sources → L1 spending (proportional distribution)
    const links: { source: number; target: number; value: number }[] = [];
    
    incomeTotals.forEach((incomeAmount, incomeCategory) => {
      const incomeNodeIdx = addNode(incomeCategory, 'income');
      
      // Distribute this income proportionally to all L1 spending categories
      l1Totals.forEach((spendAmount, l1Category) => {
        const l1NodeIdx = addNode(l1Category, 'L1');
        // Proportion based on share of total income
        const proportion = totalIncome > 0 ? incomeAmount / totalIncome : 0;
        const flowValue = spendAmount * proportion;
        
        if (flowValue > 0) {
          links.push({
            source: incomeNodeIdx,
            target: l1NodeIdx,
            value: flowValue,
          });
        }
      });
    });
    
    return { nodes, links };
  }, [income, spending, totalIncome]);

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
    sankeyData,
  };
}
