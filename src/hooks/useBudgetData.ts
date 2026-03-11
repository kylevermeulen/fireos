import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, subMonths, format, getDaysInMonth, getDate, isSameMonth } from 'date-fns';

export interface BudgetRow {
  category: string;
  budget: number | null;
  thisMonth: number;
  lastMonth: number;
  threeMonthAvg: number;
  remaining: number | null;
  projectedMonthEnd: number;
  trend: 'up' | 'down' | 'flat';
  progressPct: number | null;
}

const EXCLUDE_CATEGORIES = ['Transfer — Internal', 'Income', 'Uncategorised', 'Indonesia — Uncategorised', 'Australia — Uncategorised'];

export function useBudgetData(selectedMonth: Date = new Date()) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  const isCurrentMonth = isSameMonth(selectedMonth, now);

  const selectedMonthStart = startOfMonth(selectedMonth);
  const lastMonthStart = startOfMonth(subMonths(selectedMonth, 1));
  const threeMonthsAgoStart = startOfMonth(subMonths(selectedMonth, 3));

  // For current month, use actual day fraction; for past months, use 1.0 (full month)
  const monthFraction = isCurrentMonth
    ? getDate(now) / getDaysInMonth(now)
    : 1;

  const selectedMonthKey = format(selectedMonthStart, 'yyyy-MM');

  // Fetch distinct L1 categories from ALL transactions
  const { data: distinctCategories = [] } = useQuery({
    queryKey: ['budget-categories', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select('l1_category')
        .eq('user_id', user.id)
        .not('l1_category', 'in', `("Transfer — Internal","Income","Uncategorised","Indonesia — Uncategorised","Australia — Uncategorised")`)
        .not('l1_category', 'is', null);
      if (error) throw error;
      return [...new Set((data || []).map(r => r.l1_category).filter(Boolean))] as string[];
    },
    enabled: !!user,
  });

  // Fetch budgets
  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch transaction totals for the selected month + 3 months prior
  const { data: txTotals = [] } = useQuery({
    queryKey: ['budget-tx-totals', user?.id, selectedMonthKey],
    queryFn: async () => {
      if (!user) return [];
      const fromDate = format(threeMonthsAgoStart, 'yyyy-MM-dd');
      // End of selected month
      const endOfSelected = new Date(selectedMonthStart.getFullYear(), selectedMonthStart.getMonth() + 1, 0);
      const toDate = format(endOfSelected, 'yyyy-MM-dd');

      let allTx: any[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('transactions')
          .select('l1_category, amount_aud, transaction_date')
          .eq('user_id', user.id)
          .eq('is_internal_transfer', false)
          .not('l1_category', 'in', `("Transfer — Internal","Income","Uncategorised","Indonesia — Uncategorised","Australia — Uncategorised")`)
          .gte('transaction_date', fromDate)
          .lte('transaction_date', toDate)
          .range(from, from + batchSize - 1);
        if (error) throw error;
        allTx = allTx.concat(data || []);
        if (!data || data.length < batchSize) break;
        from += batchSize;
      }
      return allTx;
    },
    enabled: !!user,
  });

  const budgetMap = useMemo(() => {
    const map = new Map<string, number>();
    budgets.forEach((b: any) => map.set(b.l1_category, Number(b.monthly_amount)));
    return map;
  }, [budgets]);

  const rows = useMemo((): BudgetRow[] => {
    const thisMonthStr = selectedMonthKey;
    const m1 = format(subMonths(selectedMonth, 1), 'yyyy-MM');
    const m2 = format(subMonths(selectedMonth, 2), 'yyyy-MM');
    const m3 = format(subMonths(selectedMonth, 3), 'yyyy-MM');

    // Group spending by category and month
    const categoryMonths = new Map<string, Map<string, number>>();
    txTotals.forEach((tx: any) => {
      const cat = tx.l1_category;
      if (!cat) return;
      const month = tx.transaction_date?.substring(0, 7);
      if (!month) return;
      if (!categoryMonths.has(cat)) categoryMonths.set(cat, new Map());
      const monthMap = categoryMonths.get(cat)!;
      monthMap.set(month, (monthMap.get(month) || 0) + Math.abs(tx.amount_aud));
    });

    const allCats = new Set<string>([
      ...distinctCategories,
      ...budgetMap.keys(),
    ]);

    const result: BudgetRow[] = [];

    allCats.forEach((category) => {
      if (EXCLUDE_CATEGORIES.includes(category)) return;

      const monthMap = categoryMonths.get(category) || new Map();
      const thisMonth = monthMap.get(thisMonthStr) || 0;
      const lastMonth = monthMap.get(m1) || 0;
      const avg3 = ([m1, m2, m3].reduce((sum, m) => sum + (monthMap.get(m) || 0), 0)) / 3;

      const budget = budgetMap.get(category) ?? null;
      const remaining = budget !== null ? budget - thisMonth : null;
      const projectedMonthEnd = monthFraction > 0 ? thisMonth / monthFraction : thisMonth;
      const progressPct = budget !== null && budget > 0 ? (thisMonth / budget) * 100 : null;

      let trend: 'up' | 'down' | 'flat' = 'flat';
      if (avg3 > 0) {
        const ratio = projectedMonthEnd / avg3;
        if (ratio > 1.1) trend = 'up';
        else if (ratio < 0.9) trend = 'down';
      }

      result.push({
        category, budget, thisMonth, lastMonth,
        threeMonthAvg: avg3, remaining, projectedMonthEnd, trend, progressPct,
      });
    });

    result.sort((a, b) => b.thisMonth - a.thisMonth);
    return result;
  }, [txTotals, budgetMap, monthFraction, distinctCategories, selectedMonthKey, selectedMonth]);

  const summary = useMemo(() => {
    const totalBudgeted = rows.reduce((s, r) => s + (r.budget || 0), 0);
    const totalSpent = rows.reduce((s, r) => s + r.thisMonth, 0);
    const net = totalBudgeted - totalSpent;
    const pctUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
    return { totalBudgeted, totalSpent, net, pctUsed };
  }, [rows]);

  const upsertBudget = useMutation({
    mutationFn: async ({ category, amount }: { category: string; amount: number }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('budgets')
        .upsert(
          { user_id: user.id, l1_category: category, monthly_amount: amount, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,l1_category' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  return { rows, summary, upsertBudget };
}
