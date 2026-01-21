import { useMemo } from 'react';
import { useWealthSnapshots } from './useWealthData';
import { CashflowTransaction, DateRange } from '@/types/cashflow';

export interface FireSettings {
  swrPercent: number;
  realReturnPercent: number;
  targetAnnualSpend: number | null;
  includeRetirement: boolean;
  includeCrypto: boolean;
  includeOffset: boolean;
}

export interface FireMetrics {
  // From transactions
  totalIncome: number;
  totalSpending: number;
  netSurplus: number;
  savingsRate: number;
  avgMonthlySpend: number;
  annualizedSpend: number;
  
  // From wealth snapshot
  netWorth: number;
  liquidNetWorth: number;
  investableAssets: number;
  retirementTotal: number;
  
  // FIRE calculations
  fiNumber: number;
  fiPercent: number;
  runwayMonths: number;
  yearsToFi: number | null;
  
  // Fixed vs Variable
  fixedSpend: number;
  variableSpend: number;
  fixedPercent: number;
}

export interface ScenarioResult {
  swr: number;
  realReturn: number;
  spendingShock: number;
  fiNumber: number;
  fiPercent: number;
  yearsToFi: number | null;
}

// Categories classified as "fixed" expenses
const FIXED_CATEGORIES = new Set([
  'Mortgage',
  'School Fees',
  'Indonesia Rent',
  'Insurance',
  'Subscriptions',
  'Taxes & Govt Fees',
  'Indonesia Bills (Lisa)',
  'Health Insurance',
  'Car Insurance',
  'Home Insurance',
  'Utilities',
]);

export function useFireCalculations(
  transactions: CashflowTransaction[],
  dateRange: DateRange,
  settings: FireSettings
) {
  const { latestSnapshot, isLoading: wealthLoading } = useWealthSnapshots();

  const metrics = useMemo((): FireMetrics | null => {
    if (!latestSnapshot) return null;

    // Filter transactions by date range
    const filtered = transactions.filter(tx => 
      tx.date >= dateRange.from && tx.date <= dateRange.to
    );

    // Income: direction=in AND L1='Income' AND NOT internal transfer
    const income = filtered.filter(tx => 
      tx.direction === 'in' && tx.L1 === 'Income' && !tx.is_internal_transfer
    );
    
    // External spending: direction=out AND NOT internal transfer
    const spending = filtered.filter(tx => 
      tx.direction === 'out' && !tx.is_internal_transfer
    );

    const totalIncome = income.reduce((sum, tx) => sum + tx.amount_aud, 0);
    const totalSpending = spending.reduce((sum, tx) => sum + tx.amount_aud, 0);
    const netSurplus = totalIncome - totalSpending;
    const savingsRate = totalIncome > 0 ? (netSurplus / totalIncome) * 100 : 0;

    // Calculate months in range for averaging
    const msInRange = dateRange.to.getTime() - dateRange.from.getTime();
    const monthsInRange = Math.max(1, msInRange / (1000 * 60 * 60 * 24 * 30.44));
    const avgMonthlySpend = totalSpending / monthsInRange;
    const annualizedSpend = avgMonthlySpend * 12;

    // Fixed vs Variable classification
    const fixedSpend = spending
      .filter(tx => FIXED_CATEGORIES.has(tx.L1) || FIXED_CATEGORIES.has(tx.L2))
      .reduce((sum, tx) => sum + tx.amount_aud, 0);
    const variableSpend = totalSpending - fixedSpend;
    const fixedPercent = totalSpending > 0 ? (fixedSpend / totalSpending) * 100 : 0;

    // Wealth metrics from snapshot
    const netWorth = latestSnapshot.netWorth;
    const liquidNetWorth = latestSnapshot.liquidWealth - latestSnapshot.mortgageBalance;
    
    // Investable assets based on settings
    let investableAssets = latestSnapshot.investmentsAud + latestSnapshot.cashAud;
    if (settings.includeCrypto) {
      investableAssets += latestSnapshot.cryptoAud;
    }
    if (settings.includeRetirement) {
      investableAssets += latestSnapshot.retirementAud;
    }
    if (settings.includeOffset) {
      investableAssets += latestSnapshot.offsetBalance;
    }

    const retirementTotal = latestSnapshot.retirementAud;

    // FIRE calculations
    const targetSpend = settings.targetAnnualSpend ?? annualizedSpend;
    const swr = settings.swrPercent / 100;
    const fiNumber = swr > 0 ? targetSpend / swr : 0;
    const fiPercent = fiNumber > 0 ? (investableAssets / fiNumber) * 100 : 0;
    const runwayMonths = avgMonthlySpend > 0 ? investableAssets / avgMonthlySpend : 0;

    // Years to FI calculation using monthly surplus and return
    let yearsToFi: number | null = null;
    if (fiPercent < 100 && netSurplus > 0) {
      const monthlyReturn = settings.realReturnPercent / 100 / 12;
      const monthlySurplus = netSurplus / monthsInRange;
      const targetAmount = fiNumber - investableAssets;
      
      if (monthlyReturn > 0) {
        // FV = PV(1+r)^n + PMT*((1+r)^n - 1)/r
        // Solve for n using numerical approximation
        let months = 0;
        let currentValue = investableAssets;
        while (currentValue < fiNumber && months < 600) { // Cap at 50 years
          currentValue = currentValue * (1 + monthlyReturn) + monthlySurplus;
          months++;
        }
        if (months < 600) {
          yearsToFi = months / 12;
        }
      } else if (monthlySurplus > 0) {
        yearsToFi = targetAmount / (monthlySurplus * 12);
      }
    } else if (fiPercent >= 100) {
      yearsToFi = 0;
    }

    return {
      totalIncome,
      totalSpending,
      netSurplus,
      savingsRate,
      avgMonthlySpend,
      annualizedSpend,
      netWorth,
      liquidNetWorth,
      investableAssets,
      retirementTotal,
      fiNumber,
      fiPercent,
      runwayMonths,
      yearsToFi,
      fixedSpend,
      variableSpend,
      fixedPercent,
    };
  }, [transactions, dateRange, latestSnapshot, settings]);

  return { metrics, isLoading: wealthLoading };
}

export function calculateScenarios(
  investableAssets: number,
  annualizedSpend: number,
  monthlySurplus: number
): ScenarioResult[] {
  const swrOptions = [0.03, 0.035, 0.04, 0.045];
  const returnOptions = [0.03, 0.05, 0.07];
  const shockOptions = [0, 0.1, 0.2];

  const results: ScenarioResult[] = [];

  for (const swr of swrOptions) {
    for (const realReturn of returnOptions) {
      for (const shock of shockOptions) {
        const adjustedSpend = annualizedSpend * (1 + shock);
        const fiNumber = adjustedSpend / swr;
        const fiPercent = fiNumber > 0 ? (investableAssets / fiNumber) * 100 : 0;

        let yearsToFi: number | null = null;
        if (fiPercent < 100 && monthlySurplus > 0) {
          const monthlyReturn = realReturn / 12;
          let months = 0;
          let currentValue = investableAssets;
          while (currentValue < fiNumber && months < 600) {
            currentValue = currentValue * (1 + monthlyReturn) + monthlySurplus;
            months++;
          }
          if (months < 600) {
            yearsToFi = months / 12;
          }
        } else if (fiPercent >= 100) {
          yearsToFi = 0;
        }

        results.push({
          swr: swr * 100,
          realReturn: realReturn * 100,
          spendingShock: shock * 100,
          fiNumber,
          fiPercent,
          yearsToFi,
        });
      }
    }
  }

  return results;
}
