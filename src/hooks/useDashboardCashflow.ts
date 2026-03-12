import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DateRange } from '@/types/cashflow';

interface DashboardCashflow {
  totalIncome: number;
  totalSpending: number;
  netCashflow: number;
}

export function useDashboardCashflow(dateRange: DateRange) {
  const { user, sessionReady } = useAuth();

  return useQuery<DashboardCashflow>({
    queryKey: ['dashboard-cashflow', user?.id, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    enabled: sessionReady && !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const fromDate = dateRange.from?.toISOString().split('T')[0];
      const toDate = dateRange.to?.toISOString().split('T')[0];

      // Fetch income: l1_category = 'Income', not internal transfer
      const { data: incomeRows, error: incomeErr } = await supabase
        .from('transactions')
        .select('amount_aud')
        .eq('l1_category', 'Income')
        .eq('is_internal_transfer', false)
        .gte('transaction_date', fromDate!)
        .lte('transaction_date', toDate!);

      if (incomeErr) throw incomeErr;

      // Fetch spending: transaction_type = 'expense', not internal, not synthetic
      const { data: spendingRows, error: spendingErr } = await supabase
        .from('transactions')
        .select('amount_aud')
        .eq('transaction_type', 'expense')
        .eq('is_internal_transfer', false)
        .eq('is_synthetic', false)
        .gte('transaction_date', fromDate!)
        .lte('transaction_date', toDate!);

      if (spendingErr) throw spendingErr;

      const totalIncome = (incomeRows ?? []).reduce((sum, r) => sum + Math.abs(r.amount_aud), 0);
      const totalSpending = (spendingRows ?? []).reduce((sum, r) => sum + Math.abs(r.amount_aud), 0);

      return {
        totalIncome,
        totalSpending,
        netCashflow: totalIncome - totalSpending,
      };
    },
  });
}
