import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from './useAuth';

interface Account {
  id: string;
  name: string;
  institution: string;
  country: string;
  currency: 'AUD' | 'USD' | 'IDR';
  account_type: 'cash' | 'investment' | 'retirement' | 'crypto' | 'offset';
  liquidity_class: 'liquid' | 'illiquid';
}

interface Balance {
  id: string;
  account_id: string;
  balance_date: string;
  amount_native: number;
  amount_aud: number;
}

interface Liability {
  id: string;
  name: string;
  institution: string | null;
  liability_type: 'fixed_mortgage' | 'variable_mortgage' | 'loan';
  currency: 'AUD' | 'USD' | 'IDR';
  interest_rate: number | null;
  offset_account_id: string | null;
}

interface LiabilityBalance {
  id: string;
  liability_id: string;
  balance_date: string;
  balance: number;
}

interface Valuation {
  id: string;
  name: string;
  asset_type: 'home' | 'business';
  valuation_date: string;
  value_aud: number;
}

interface MonthlySnapshot {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liquidWealth: number;
  illiquidWealth: number;
  liquidityPercent: number;
  cashAud: number;
  investmentsAud: number;
  retirementAud: number;
  cryptoAud: number;
  homeValue: number;
  businessValue: number;
  mortgageBalance: number;
  offsetBalance: number;
  mortgageNetOfOffset: number;
}

export function useAccounts() {
  const { user, sessionReady } = useAuth();

  return useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as Account[];
    },
    enabled: sessionReady && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useLiabilities() {
  const { user, sessionReady } = useAuth();

  return useQuery({
    queryKey: ['liabilities', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('liabilities')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data as Liability[];
    },
    enabled: sessionReady && !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useBalances() {
  const { user, sessionReady } = useAuth();

  return useQuery({
    queryKey: ['balances', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('balances')
        .select('*')
        .order('balance_date', { ascending: true });
      
      if (error) throw error;
      return data as Balance[];
    },
    enabled: sessionReady && !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useLiabilityBalances() {
  const { user, sessionReady } = useAuth();

  return useQuery({
    queryKey: ['liability_balances', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('liability_balances')
        .select('*')
        .order('balance_date', { ascending: true });
      
      if (error) throw error;
      return data as LiabilityBalance[];
    },
    enabled: sessionReady && !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useValuations() {
  const { user, sessionReady } = useAuth();

  return useQuery({
    queryKey: ['valuations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('valuations')
        .select('*')
        .order('valuation_date', { ascending: true });
      
      if (error) throw error;
      return data as Valuation[];
    },
    enabled: sessionReady && !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Normalizes any date to canonical month key (YYYY-MM-01 UTC)
 */
function toMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export function useWealthSnapshots() {
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: balances, isLoading: balancesLoading } = useBalances();
  const { data: liabilities, isLoading: liabilitiesLoading } = useLiabilities();
  const { data: liabilityBalances, isLoading: liabilityBalancesLoading } = useLiabilityBalances();
  const { data: valuations, isLoading: valuationsLoading } = useValuations();

  const isLoading = accountsLoading || balancesLoading || liabilitiesLoading || liabilityBalancesLoading || valuationsLoading;

  const snapshots = useMemo(() => {
    if (!accounts || !balances || !liabilities || !liabilityBalances || !valuations) {
      return [];
    }

    // Normalize all dates to month keys and collect unique months
    const allMonths = new Set<string>();
    balances.forEach(b => allMonths.add(toMonthKey(b.balance_date)));
    liabilityBalances.forEach(lb => allMonths.add(toMonthKey(lb.balance_date)));
    valuations.forEach(v => allMonths.add(toMonthKey(v.valuation_date)));

    const sortedMonths = Array.from(allMonths).sort();

    // Create lookup maps
    const accountById = new Map(accounts.map(a => [a.id, a]));
    const liabilityById = new Map(liabilities.map(l => [l.id, l]));

    // Build balance lookup: accountId -> monthKey -> balance (use latest within month if multiple)
    const balanceGrid = new Map<string, Map<string, Balance>>();
    for (const b of balances) {
      const monthKey = toMonthKey(b.balance_date);
      if (!balanceGrid.has(b.account_id)) {
        balanceGrid.set(b.account_id, new Map());
      }
      const accountBalances = balanceGrid.get(b.account_id)!;
      const existing = accountBalances.get(monthKey);
      // Keep the latest balance within the same month
      if (!existing || b.balance_date > existing.balance_date) {
        accountBalances.set(monthKey, b);
      }
    }

    // Build liability balance lookup: liabilityId -> monthKey -> balance
    const liabilityGrid = new Map<string, Map<string, LiabilityBalance>>();
    for (const lb of liabilityBalances) {
      const monthKey = toMonthKey(lb.balance_date);
      if (!liabilityGrid.has(lb.liability_id)) {
        liabilityGrid.set(lb.liability_id, new Map());
      }
      const liabBalances = liabilityGrid.get(lb.liability_id)!;
      const existing = liabBalances.get(monthKey);
      if (!existing || lb.balance_date > existing.balance_date) {
        liabBalances.set(monthKey, lb);
      }
    }

    // Build valuation lookup: assetType -> monthKey -> valuation
    const valuationGrid = new Map<string, Map<string, Valuation>>();
    for (const v of valuations) {
      const monthKey = toMonthKey(v.valuation_date);
      if (!valuationGrid.has(v.asset_type)) {
        valuationGrid.set(v.asset_type, new Map());
      }
      const assetValuations = valuationGrid.get(v.asset_type)!;
      const existing = assetValuations.get(monthKey);
      if (!existing || v.valuation_date > existing.valuation_date) {
        assetValuations.set(monthKey, v);
      }
    }

    // Track first appearance of each account/liability/valuation for proper initialization
    const accountFirstMonth = new Map<string, string>();
    for (const [accountId, monthMap] of balanceGrid) {
      const months = Array.from(monthMap.keys()).sort();
      if (months.length > 0) {
        accountFirstMonth.set(accountId, months[0]);
      }
    }

    const liabilityFirstMonth = new Map<string, string>();
    for (const [liabilityId, monthMap] of liabilityGrid) {
      const months = Array.from(monthMap.keys()).sort();
      if (months.length > 0) {
        liabilityFirstMonth.set(liabilityId, months[0]);
      }
    }

    const valuationFirstMonth = new Map<string, string>();
    for (const [assetType, monthMap] of valuationGrid) {
      const months = Array.from(monthMap.keys()).sort();
      if (months.length > 0) {
        valuationFirstMonth.set(assetType, months[0]);
      }
    }

    // Carry-forward state trackers
    const lastKnownBalance = new Map<string, number>(); // accountId -> amount_aud
    const lastKnownLiability = new Map<string, number>(); // liabilityId -> balance
    const lastKnownValuation = new Map<string, number>(); // assetType -> value_aud

    const result: MonthlySnapshot[] = [];

    for (const monthKey of sortedMonths) {
      // Calculate asset totals by type with carry-forward
      let cashAud = 0;
      let investmentsAud = 0;
      let retirementAud = 0;
      let cryptoAud = 0;
      let liquidWealth = 0;
      let illiquidWealth = 0;
      let offsetBalance = 0;

      for (const account of accounts) {
        const accountMonths = balanceGrid.get(account.id);
        const balance = accountMonths?.get(monthKey);
        
        let amount: number;
        if (balance) {
          // We have data for this month - update carry-forward
          amount = balance.amount_aud;
          lastKnownBalance.set(account.id, amount);
        } else {
          // No data for this month
          const firstMonth = accountFirstMonth.get(account.id);
          if (!firstMonth || monthKey < firstMonth) {
            // Account hasn't appeared yet - contribute 0
            amount = 0;
          } else {
            // Carry forward last known value
            amount = lastKnownBalance.get(account.id) ?? 0;
          }
        }

        // Track by account type
        switch (account.account_type) {
          case 'cash':
            cashAud += amount;
            break;
          case 'offset':
            cashAud += amount;
            offsetBalance = amount;
            break;
          case 'investment':
            investmentsAud += amount;
            break;
          case 'retirement':
            retirementAud += amount;
            break;
          case 'crypto':
            cryptoAud += amount;
            break;
        }

        // Track by liquidity
        if (account.liquidity_class === 'liquid') {
          liquidWealth += amount;
        } else {
          illiquidWealth += amount;
        }
      }

      // Calculate valuations with carry-forward
      let homeValue = 0;
      let businessValue = 0;

      for (const assetType of ['home', 'business'] as const) {
        const valMonths = valuationGrid.get(assetType);
        const valuation = valMonths?.get(monthKey);
        
        let value: number;
        if (valuation) {
          value = valuation.value_aud;
          lastKnownValuation.set(assetType, value);
        } else {
          const firstMonth = valuationFirstMonth.get(assetType);
          if (!firstMonth || monthKey < firstMonth) {
            value = 0;
          } else {
            value = lastKnownValuation.get(assetType) ?? 0;
          }
        }

        if (assetType === 'home') {
          homeValue = value;
        } else {
          businessValue = value;
        }
      }

      // Add valuations to illiquid wealth
      illiquidWealth += homeValue + businessValue;

      // Calculate liabilities with carry-forward
      let mortgageBalance = 0;
      let loanBalance = 0;

      for (const liability of liabilities) {
        const liabMonths = liabilityGrid.get(liability.id);
        const lb = liabMonths?.get(monthKey);
        
        let balance: number;
        if (lb) {
          balance = lb.balance;
          lastKnownLiability.set(liability.id, balance);
        } else {
          const firstMonth = liabilityFirstMonth.get(liability.id);
          if (!firstMonth || monthKey < firstMonth) {
            balance = 0;
          } else {
            balance = lastKnownLiability.get(liability.id) ?? 0;
          }
        }

        if (liability.liability_type === 'fixed_mortgage' || liability.liability_type === 'variable_mortgage') {
          mortgageBalance += balance;
        } else if (liability.liability_type === 'loan') {
          loanBalance += balance;
        }
      }

      const totalLiabilities = mortgageBalance + loanBalance;
      const totalAssets = cashAud + investmentsAud + retirementAud + cryptoAud + homeValue + businessValue;
      const netWorth = totalAssets - totalLiabilities;
      const mortgageNetOfOffset = mortgageBalance - offsetBalance;

      result.push({
        date: monthKey,
        totalAssets,
        totalLiabilities,
        netWorth,
        liquidWealth,
        illiquidWealth,
        liquidityPercent: netWorth > 0 ? liquidWealth / netWorth : 0,
        cashAud,
        investmentsAud,
        retirementAud,
        cryptoAud,
        homeValue,
        businessValue,
        mortgageBalance,
        offsetBalance,
        mortgageNetOfOffset,
      });
    }

    return result;
  }, [accounts, balances, liabilities, liabilityBalances, valuations]);

  // Get the latest snapshot for current values
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const previousSnapshot = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  return {
    snapshots,
    latestSnapshot,
    previousSnapshot,
    isLoading,
    accounts,
    liabilities,
  };
}

// Helper to get latest balance for each account
export function useLatestBalances() {
  const { data: accounts } = useAccounts();
  const { data: balances } = useBalances();

  return useMemo(() => {
    if (!accounts || !balances) return [];

    const latestByAccount = new Map<string, Balance>();
    
    for (const balance of balances) {
      const existing = latestByAccount.get(balance.account_id);
      if (!existing || balance.balance_date > existing.balance_date) {
        latestByAccount.set(balance.account_id, balance);
      }
    }

    return accounts.map(account => ({
      ...account,
      latestBalance: latestByAccount.get(account.id),
    }));
  }, [accounts, balances]);
}

// Helper to get latest balance for each liability
export function useLatestLiabilityBalances() {
  const { data: liabilities } = useLiabilities();
  const { data: liabilityBalances } = useLiabilityBalances();

  return useMemo(() => {
    if (!liabilities || !liabilityBalances) return [];

    const latestByLiability = new Map<string, LiabilityBalance>();
    
    for (const lb of liabilityBalances) {
      const existing = latestByLiability.get(lb.liability_id);
      if (!existing || lb.balance_date > existing.balance_date) {
        latestByLiability.set(lb.liability_id, lb);
      }
    }

    return liabilities.map(liability => ({
      ...liability,
      latestBalance: latestByLiability.get(liability.id),
    }));
  }, [liabilities, liabilityBalances]);
}
