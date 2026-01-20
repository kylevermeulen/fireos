import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

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
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as Account[];
    },
  });
}

export function useLiabilities() {
  return useQuery({
    queryKey: ['liabilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('liabilities')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data as Liability[];
    },
  });
}

export function useBalances() {
  return useQuery({
    queryKey: ['balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('balances')
        .select('*')
        .order('balance_date', { ascending: true });
      
      if (error) throw error;
      return data as Balance[];
    },
  });
}

export function useLiabilityBalances() {
  return useQuery({
    queryKey: ['liability_balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('liability_balances')
        .select('*')
        .order('balance_date', { ascending: true });
      
      if (error) throw error;
      return data as LiabilityBalance[];
    },
  });
}

export function useValuations() {
  return useQuery({
    queryKey: ['valuations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('valuations')
        .select('*')
        .order('valuation_date', { ascending: true });
      
      if (error) throw error;
      return data as Valuation[];
    },
  });
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

    // Get unique dates from all sources
    const allDates = new Set<string>();
    balances.forEach(b => allDates.add(b.balance_date));
    liabilityBalances.forEach(lb => allDates.add(lb.balance_date));
    valuations.forEach(v => allDates.add(v.valuation_date));

    const sortedDates = Array.from(allDates).sort();

    // Create account lookup maps
    const accountById = new Map(accounts.map(a => [a.id, a]));
    const liabilityById = new Map(liabilities.map(l => [l.id, l]));

    // Find offset account ID
    const offsetAccountId = accounts.find(a => a.account_type === 'offset')?.id;

    const result: MonthlySnapshot[] = [];

    for (const date of sortedDates) {
      // Get balances for this date
      const dateBalances = balances.filter(b => b.balance_date === date);
      const dateLiabilityBalances = liabilityBalances.filter(lb => lb.balance_date === date);
      const dateValuations = valuations.filter(v => v.valuation_date === date);

      // Calculate asset totals by type
      let cashAud = 0;
      let investmentsAud = 0;
      let retirementAud = 0;
      let cryptoAud = 0;
      let liquidWealth = 0;
      let illiquidWealth = 0;
      let offsetBalance = 0;

      for (const balance of dateBalances) {
        const account = accountById.get(balance.account_id);
        if (!account) continue;

        const amount = balance.amount_aud;

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

      // Calculate valuations
      let homeValue = 0;
      let businessValue = 0;

      for (const valuation of dateValuations) {
        if (valuation.asset_type === 'home') {
          homeValue = valuation.value_aud;
        } else if (valuation.asset_type === 'business') {
          businessValue = valuation.value_aud;
        }
      }

      // Add valuations to illiquid wealth
      illiquidWealth += homeValue + businessValue;

      // Calculate liabilities
      let mortgageBalance = 0;
      let loanBalance = 0;

      for (const lb of dateLiabilityBalances) {
        const liability = liabilityById.get(lb.liability_id);
        if (!liability) continue;

        if (liability.liability_type === 'fixed_mortgage' || liability.liability_type === 'variable_mortgage') {
          mortgageBalance += lb.balance;
        } else if (liability.liability_type === 'loan') {
          loanBalance += lb.balance;
        }
      }

      const totalLiabilities = mortgageBalance + loanBalance;
      const totalAssets = cashAud + investmentsAud + retirementAud + cryptoAud + homeValue + businessValue;
      const netWorth = totalAssets - totalLiabilities;
      const mortgageNetOfOffset = mortgageBalance - offsetBalance;

      result.push({
        date,
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
