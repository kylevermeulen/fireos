import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useLiabilities, useLiabilityBalances, useAccounts, useBalances } from './useWealthData';
import { useAuth } from './useAuth';

// Weekly rent constant (default: $1,300/week = $67,600/year)
const WEEKLY_RENT = 1300;
const DEFAULT_ANNUAL_RENTAL_INCOME = WEEKLY_RENT * 52;

interface MortgageOverride {
  id: string;
  user_id: string;
  field_name: string;
  field_value: {
    value: number;
    liability_id?: string;
  };
  created_at: string;
  updated_at: string;
}

interface LoanSplit {
  id: string;
  name: string;
  type: 'fixed' | 'variable';
  balance: number;
  rate: number;
  monthlyRepayment: number;
  estimatedPayoffDate: string | null;
  monthlyInterest: number;
}

interface MortgageSnapshot {
  monthKey: string;
  totalLoan: number;
  offsetBalance: number;
  netMortgage: number;
  fixedBalance: number;
  variableBalance: number;
  monthlyInterest: number;
}

export function useMortgageOverrides() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mortgage_overrides', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('mortgage_overrides')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as MortgageOverride[];
    },
    enabled: !!user?.id,
  });
}

export function useUpsertMortgageOverride() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ fieldName, fieldValue }: { fieldName: string; fieldValue: { value: number; liability_id?: string } }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('mortgage_overrides')
        .upsert(
          {
            user_id: user.id,
            field_name: fieldName,
            field_value: fieldValue,
          },
          { onConflict: 'user_id,field_name' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mortgage_overrides'] });
    },
  });
}

export function useMortgageData() {
  const { data: liabilities, isLoading: liabilitiesLoading } = useLiabilities();
  const { data: liabilityBalances, isLoading: liabilityBalancesLoading } = useLiabilityBalances();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: balances, isLoading: balancesLoading } = useBalances();
  const { data: overrides, isLoading: overridesLoading } = useMortgageOverrides();

  const isLoading = liabilitiesLoading || liabilityBalancesLoading || accountsLoading || balancesLoading || overridesLoading;

  const mortgageData = useMemo(() => {
    if (!liabilities || !liabilityBalances || !accounts || !balances) {
      return null;
    }

    // Build overrides map
    const overrideMap = new Map<string, { value: number; liability_id?: string }>();
    if (overrides) {
      for (const o of overrides) {
        overrideMap.set(o.field_name, o.field_value);
      }
    }

    // Get mortgage liabilities
    const fixedMortgage = liabilities.find(l => l.liability_type === 'fixed_mortgage');
    const variableMortgage = liabilities.find(l => l.liability_type === 'variable_mortgage');

    // Get latest balance for each mortgage
    const latestByLiability = new Map<string, { balance: number; date: string }>();
    for (const lb of liabilityBalances) {
      const existing = latestByLiability.get(lb.liability_id);
      if (!existing || lb.balance_date > existing.date) {
        latestByLiability.set(lb.liability_id, { balance: lb.balance, date: lb.balance_date });
      }
    }

    // Get offset account
    const offsetAccount = accounts.find(a => a.account_type === 'offset');
    let offsetBalance = 0;
    let offsetDate = '';
    
    if (offsetAccount) {
      // Check for override
      const offsetOverride = overrideMap.get('offset_balance');
      if (offsetOverride) {
        offsetBalance = offsetOverride.value;
      } else {
        const offsetBalances = balances.filter(b => b.account_id === offsetAccount.id);
        if (offsetBalances.length > 0) {
          const latestOffset = offsetBalances.reduce((a, b) => 
            a.balance_date > b.balance_date ? a : b
          );
          offsetBalance = latestOffset.amount_aud;
          offsetDate = latestOffset.balance_date;
        }
      }
    }

    // Get values with override precedence
    const getBalanceWithOverride = (liabilityId: string | undefined, overrideKey: string): number => {
      const override = overrideMap.get(overrideKey);
      if (override && (!override.liability_id || override.liability_id === liabilityId)) {
        return override.value;
      }
      if (!liabilityId) return 0;
      return latestByLiability.get(liabilityId)?.balance ?? 0;
    };

    const getRateWithOverride = (liability: typeof fixedMortgage, overrideKey: string): number => {
      const override = overrideMap.get(overrideKey);
      if (override) {
        return override.value;
      }
      return liability?.interest_rate ?? 0;
    };

    const getRepaymentWithOverride = (overrideKey: string, defaultValue: number): number => {
      const override = overrideMap.get(overrideKey);
      if (override) {
        return override.value;
      }
      return defaultValue;
    };

    const fixedBalance = getBalanceWithOverride(fixedMortgage?.id, 'fixed_balance');
    const variableBalance = getBalanceWithOverride(variableMortgage?.id, 'variable_balance');
    const fixedRate = getRateWithOverride(fixedMortgage, 'fixed_rate');
    const variableRate = getRateWithOverride(variableMortgage, 'variable_rate');
    
    // Default repayments (calculated if not overridden)
    const defaultFixedRepayment = (fixedBalance * (fixedRate / 100)) / 12 + (fixedBalance / 360); // Simplified P&I
    const defaultVariableRepayment = (variableBalance * (variableRate / 100)) / 12 + (variableBalance / 360);
    
    const fixedRepayment = getRepaymentWithOverride('fixed_repayment', defaultFixedRepayment);
    const variableRepayment = getRepaymentWithOverride('variable_repayment', defaultVariableRepayment);
    const monthlyRequiredPayment = getRepaymentWithOverride('monthly_payment', fixedRepayment + variableRepayment);

    // Original loan amount (from override or estimate from snapshots)
    const originalLoanOverride = overrideMap.get('original_loan');
    let originalLoan = originalLoanOverride?.value ?? 0;
    
    if (!originalLoan) {
      // Estimate from first known balances
      const firstBalances = new Map<string, number>();
      for (const lb of liabilityBalances) {
        const mortgageLiab = liabilities.find(l => l.id === lb.liability_id);
        if (mortgageLiab && (mortgageLiab.liability_type === 'fixed_mortgage' || mortgageLiab.liability_type === 'variable_mortgage')) {
          const existing = firstBalances.get(lb.liability_id);
          if (existing === undefined) {
            firstBalances.set(lb.liability_id, lb.balance);
          }
        }
      }
      originalLoan = Array.from(firstBalances.values()).reduce((a, b) => a + b, 0);
    }

    const totalMortgage = fixedBalance + variableBalance;
    const mortgageNetOfOffset = totalMortgage - offsetBalance;

    // Calculate monthly interest estimates
    const fixedMonthlyInterest = (fixedBalance * (fixedRate / 100)) / 12;
    const effectiveVariableBalance = Math.max(0, variableBalance - offsetBalance);
    const variableMonthlyInterest = (effectiveVariableBalance * (variableRate / 100)) / 12;
    const totalMonthlyInterest = fixedMonthlyInterest + variableMonthlyInterest;

    // Interest without offset (for comparison)
    const variableMonthlyInterestWithoutOffset = (variableBalance * (variableRate / 100)) / 12;
    const totalMonthlyInterestWithoutOffset = fixedMonthlyInterest + variableMonthlyInterestWithoutOffset;
    const monthlySavingsFromOffset = totalMonthlyInterestWithoutOffset - totalMonthlyInterest;

    // Weighted average rate
    const weightedRate = totalMortgage > 0 
      ? (fixedBalance * fixedRate + variableBalance * variableRate) / totalMortgage 
      : 0;

    // Calculate payoff dates (simplified - monthly payments)
    const calculatePayoffDate = (balance: number, rate: number, payment: number): string | null => {
      if (balance <= 0 || payment <= 0) return null;
      const monthlyRate = rate / 100 / 12;
      if (monthlyRate === 0) {
        const months = balance / payment;
        const date = new Date();
        date.setMonth(date.getMonth() + Math.ceil(months));
        return date.toISOString().split('T')[0];
      }
      // n = -log(1 - (r * P / M)) / log(1 + r)
      const n = -Math.log(1 - (monthlyRate * balance / payment)) / Math.log(1 + monthlyRate);
      if (isNaN(n) || !isFinite(n) || n < 0) return null;
      const date = new Date();
      date.setMonth(date.getMonth() + Math.ceil(n));
      return date.toISOString().split('T')[0];
    };

    const fixedPayoffDate = calculatePayoffDate(fixedBalance, fixedRate, fixedRepayment);
    const variablePayoffDate = calculatePayoffDate(effectiveVariableBalance, variableRate, variableRepayment);

    // Property value (from override or default 0)
    const propertyValueOverride = overrideMap.get('property_value');
    const propertyValue = propertyValueOverride?.value ?? 0;

    // Calculate LVR and Equity
    const lvr = propertyValue > 0 ? (totalMortgage / propertyValue) * 100 : 0;
    const equity = propertyValue - totalMortgage;

    // Rental income
    const monthlyRent = WEEKLY_RENT * 52 / 12;

    // Rental performance inputs (annual)
    const annualRentalIncome = overrideMap.get('annual_rental_income')?.value ?? DEFAULT_ANNUAL_RENTAL_INCOME;
    const annualRentalFees = overrideMap.get('annual_rental_fees')?.value ?? 0;
    const annualCouncilRates = overrideMap.get('annual_council_rates')?.value ?? 0;
    const annualSewageRates = overrideMap.get('annual_sewage_rates')?.value ?? 0;
    const annualImprovements = overrideMap.get('annual_improvements')?.value ?? 0;

    // Rental performance calculated outputs
    const netRentalIncomeAnnual = annualRentalIncome - annualRentalFees - annualCouncilRates - annualSewageRates - annualImprovements;
    const netRentalIncomeMonthly = netRentalIncomeAnnual / 12;
    const netYieldPercent = propertyValue > 0 ? (netRentalIncomeAnnual / propertyValue) * 100 : 0;
    const annualInterest = totalMonthlyInterest * 12;
    const interestCoverageRatio = annualInterest > 0 ? netRentalIncomeAnnual / annualInterest : 0;
    const netPositionAfterInterest = netRentalIncomeAnnual - annualInterest;

    // Progress percentage
    const percentPaidOff = originalLoan > 0 ? ((originalLoan - mortgageNetOfOffset) / originalLoan) * 100 : 0;

    // Build loan splits
    const loanSplits: LoanSplit[] = [];
    
    if (fixedMortgage) {
      loanSplits.push({
        id: fixedMortgage.id,
        name: fixedMortgage.name,
        type: 'fixed',
        balance: fixedBalance,
        rate: fixedRate,
        monthlyRepayment: fixedRepayment,
        estimatedPayoffDate: fixedPayoffDate,
        monthlyInterest: fixedMonthlyInterest,
      });
    }

    if (variableMortgage) {
      loanSplits.push({
        id: variableMortgage.id,
        name: variableMortgage.name,
        type: 'variable',
        balance: variableBalance,
        rate: variableRate,
        monthlyRepayment: variableRepayment,
        estimatedPayoffDate: variablePayoffDate,
        monthlyInterest: variableMonthlyInterest,
      });
    }

    // Get latest date
    const latestDate = fixedMortgage 
      ? latestByLiability.get(fixedMortgage.id)?.date 
      : variableMortgage 
        ? latestByLiability.get(variableMortgage.id)?.date 
        : '';

    return {
      totalMortgage,
      offsetBalance,
      offsetDate,
      mortgageNetOfOffset,
      fixedBalance,
      fixedRate,
      variableBalance,
      variableRate,
      weightedRate,
      originalLoan,
      monthlyRequiredPayment,
      totalMonthlyInterest,
      monthlySavingsFromOffset,
      weeklyRent: WEEKLY_RENT,
      monthlyRent,
      percentPaidOff,
      loanSplits,
      latestDate: latestDate || '',
      fixedMortgageId: fixedMortgage?.id,
      variableMortgageId: variableMortgage?.id,
      offsetAccountId: offsetAccount?.id,
      // Property & LVR
      propertyValue,
      lvr,
      equity,
      // Rental performance
      annualRentalIncome,
      annualRentalFees,
      annualCouncilRates,
      annualSewageRates,
      annualImprovements,
      netRentalIncomeAnnual,
      netRentalIncomeMonthly,
      netYieldPercent,
      interestCoverageRatio,
      netPositionAfterInterest,
      annualInterest,
    };
  }, [liabilities, liabilityBalances, accounts, balances, overrides]);

  // Build historical snapshots for charts
  const historicalSnapshots = useMemo((): MortgageSnapshot[] => {
    if (!liabilities || !liabilityBalances || !accounts || !balances) {
      return [];
    }

    const fixedMortgage = liabilities.find(l => l.liability_type === 'fixed_mortgage');
    const variableMortgage = liabilities.find(l => l.liability_type === 'variable_mortgage');
    const offsetAccount = accounts.find(a => a.account_type === 'offset');

    // Collect all months
    const allMonths = new Set<string>();
    liabilityBalances.forEach(lb => {
      const d = new Date(lb.balance_date);
      const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
      allMonths.add(monthKey);
    });
    balances.forEach(b => {
      const d = new Date(b.balance_date);
      const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
      allMonths.add(monthKey);
    });

    const sortedMonths = Array.from(allMonths).sort();

    // Build grids
    const liabilityGrid = new Map<string, Map<string, number>>();
    for (const lb of liabilityBalances) {
      const d = new Date(lb.balance_date);
      const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
      if (!liabilityGrid.has(lb.liability_id)) {
        liabilityGrid.set(lb.liability_id, new Map());
      }
      liabilityGrid.get(lb.liability_id)!.set(monthKey, lb.balance);
    }

    const offsetGrid = new Map<string, number>();
    if (offsetAccount) {
      for (const b of balances.filter(b => b.account_id === offsetAccount.id)) {
        const d = new Date(b.balance_date);
        const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
        offsetGrid.set(monthKey, b.amount_aud);
      }
    }

    // Carry-forward logic
    let lastFixed = 0;
    let lastVariable = 0;
    let lastOffset = 0;

    const result: MortgageSnapshot[] = [];

    for (const monthKey of sortedMonths) {
      if (fixedMortgage && liabilityGrid.get(fixedMortgage.id)?.has(monthKey)) {
        lastFixed = liabilityGrid.get(fixedMortgage.id)!.get(monthKey)!;
      }
      if (variableMortgage && liabilityGrid.get(variableMortgage.id)?.has(monthKey)) {
        lastVariable = liabilityGrid.get(variableMortgage.id)!.get(monthKey)!;
      }
      if (offsetGrid.has(monthKey)) {
        lastOffset = offsetGrid.get(monthKey)!;
      }

      const totalLoan = lastFixed + lastVariable;
      const netMortgage = totalLoan - lastOffset;
      
      // Calculate interest for this snapshot
      const fixedRate = fixedMortgage?.interest_rate ?? 0;
      const variableRate = variableMortgage?.interest_rate ?? 0;
      const effectiveVariable = Math.max(0, lastVariable - lastOffset);
      const monthlyInterest = (lastFixed * (fixedRate / 100) / 12) + (effectiveVariable * (variableRate / 100) / 12);

      result.push({
        monthKey,
        totalLoan,
        offsetBalance: lastOffset,
        netMortgage,
        fixedBalance: lastFixed,
        variableBalance: lastVariable,
        monthlyInterest,
      });
    }

    return result;
  }, [liabilities, liabilityBalances, accounts, balances]);

  return {
    mortgageData,
    historicalSnapshots,
    isLoading,
  };
}
