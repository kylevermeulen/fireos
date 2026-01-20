import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLiabilities, useLiabilityBalances, useAccounts, useBalances } from '@/hooks/useWealthData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompactCurrency, formatDate } from '@/lib/format';
import { Home, Wallet, TrendingDown, DollarSign } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Weekly rent constant
const WEEKLY_RENT = 1300;

export default function Mortgage() {
  const { data: liabilities, isLoading: liabilitiesLoading } = useLiabilities();
  const { data: liabilityBalances, isLoading: liabilityBalancesLoading } = useLiabilityBalances();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: balances, isLoading: balancesLoading } = useBalances();

  const isLoading = liabilitiesLoading || liabilityBalancesLoading || accountsLoading || balancesLoading;

  const mortgageData = useMemo(() => {
    if (!liabilities || !liabilityBalances || !accounts || !balances) {
      return null;
    }

    // Get mortgage liabilities
    const mortgages = liabilities.filter(
      l => l.liability_type === 'fixed_mortgage' || l.liability_type === 'variable_mortgage'
    );

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
      const offsetBalances = balances.filter(b => b.account_id === offsetAccount.id);
      if (offsetBalances.length > 0) {
        const latestOffset = offsetBalances[offsetBalances.length - 1];
        offsetBalance = latestOffset.amount_aud;
        offsetDate = latestOffset.balance_date;
      }
    }

    // Calculate mortgage details
    let fixedBalance = 0;
    let fixedRate = 0;
    let variableBalance = 0;
    let variableRate = 0;
    let latestDate = '';

    const mortgageDetails: Array<{
      name: string;
      type: string;
      balance: number;
      rate: number;
      date: string;
    }> = [];

    for (const mortgage of mortgages) {
      const balanceData = latestByLiability.get(mortgage.id);
      if (!balanceData) continue;

      if (balanceData.date > latestDate) {
        latestDate = balanceData.date;
      }

      const detail = {
        name: mortgage.name,
        type: mortgage.liability_type === 'fixed_mortgage' ? 'Fixed' : 'Variable',
        balance: balanceData.balance,
        rate: mortgage.interest_rate || 0,
        date: balanceData.date,
      };

      mortgageDetails.push(detail);

      if (mortgage.liability_type === 'fixed_mortgage') {
        fixedBalance = balanceData.balance;
        fixedRate = mortgage.interest_rate || 0;
      } else {
        variableBalance = balanceData.balance;
        variableRate = mortgage.interest_rate || 0;
      }
    }

    const totalMortgage = fixedBalance + variableBalance;
    const mortgageNetOfOffset = totalMortgage - offsetBalance;

    // Calculate monthly interest estimates
    const fixedMonthlyInterest = (fixedBalance * (fixedRate / 100)) / 12;
    const variableMonthlyInterest = ((variableBalance - offsetBalance) * (variableRate / 100)) / 12;
    const totalMonthlyInterest = fixedMonthlyInterest + Math.max(0, variableMonthlyInterest);

    // Interest without offset (for comparison)
    const variableMonthlyInterestWithoutOffset = (variableBalance * (variableRate / 100)) / 12;
    const totalMonthlyInterestWithoutOffset = fixedMonthlyInterest + variableMonthlyInterestWithoutOffset;
    const monthlySavingsFromOffset = totalMonthlyInterestWithoutOffset - totalMonthlyInterest;

    // Rental income
    const monthlyRent = WEEKLY_RENT * 52 / 12;

    return {
      totalMortgage,
      offsetBalance,
      offsetDate,
      mortgageNetOfOffset,
      fixedBalance,
      fixedRate,
      variableBalance,
      variableRate,
      totalMonthlyInterest,
      monthlySavingsFromOffset,
      weeklyRent: WEEKLY_RENT,
      monthlyRent,
      mortgageDetails,
      latestDate,
    };
  }, [liabilities, liabilityBalances, accounts, balances]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mortgage</h1>
            <p className="text-muted-foreground">Property loan details</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!mortgageData || mortgageData.totalMortgage === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mortgage</h1>
            <p className="text-muted-foreground">Property loan details</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Home className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Mortgage Data</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Import your mortgage data to see loan details and offset impact.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mortgage</h1>
          <p className="text-muted-foreground">Property loan details</p>
        </div>

        {/* Top stat cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mortgage Net of Offset</p>
                  <p className="text-2xl font-bold">{formatCompactCurrency(mortgageData.mortgageNetOfOffset)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    As of {formatDate(mortgageData.latestDate, 'short')}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Home className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Mortgage</p>
                  <p className="text-2xl font-bold">{formatCompactCurrency(mortgageData.totalMortgage)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Offset: {formatCompactCurrency(mortgageData.offsetBalance)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Est. Monthly Interest</p>
                  <p className="text-2xl font-bold">{formatCompactCurrency(mortgageData.totalMonthlyInterest)}</p>
                  <p className="text-xs text-success mt-1">
                    Saving {formatCompactCurrency(mortgageData.monthlySavingsFromOffset)}/mo
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <TrendingDown className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rental Income</p>
                  <p className="text-2xl font-bold">{formatCompactCurrency(mortgageData.monthlyRent)}/mo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${mortgageData.weeklyRent.toLocaleString()}/week
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loan Split Table */}
        <Card>
          <CardHeader>
            <CardTitle>Loan Split</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Interest Rate</TableHead>
                  <TableHead className="text-right">Monthly Interest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Fixed</TableCell>
                  <TableCell className="text-right">{formatCompactCurrency(mortgageData.fixedBalance)}</TableCell>
                  <TableCell className="text-right">{mortgageData.fixedRate.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">
                    {formatCompactCurrency((mortgageData.fixedBalance * (mortgageData.fixedRate / 100)) / 12)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Variable</TableCell>
                  <TableCell className="text-right">{formatCompactCurrency(mortgageData.variableBalance)}</TableCell>
                  <TableCell className="text-right">{mortgageData.variableRate.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">
                    {formatCompactCurrency(Math.max(0, ((mortgageData.variableBalance - mortgageData.offsetBalance) * (mortgageData.variableRate / 100)) / 12))}
                  </TableCell>
                </TableRow>
                <TableRow className="font-medium bg-muted/50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{formatCompactCurrency(mortgageData.totalMortgage)}</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right">{formatCompactCurrency(mortgageData.totalMonthlyInterest)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Offset Impact */}
        <Card>
          <CardHeader>
            <CardTitle>Offset Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Offset Balance</p>
                <p className="text-xl font-bold">{formatCompactCurrency(mortgageData.offsetBalance)}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Monthly Savings</p>
                <p className="text-xl font-bold text-success">{formatCompactCurrency(mortgageData.monthlySavingsFromOffset)}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Annual Savings</p>
                <p className="text-xl font-bold text-success">{formatCompactCurrency(mortgageData.monthlySavingsFromOffset * 12)}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Your offset account reduces the effective principal on your variable loan from{' '}
              {formatCompactCurrency(mortgageData.variableBalance)} to{' '}
              {formatCompactCurrency(Math.max(0, mortgageData.variableBalance - mortgageData.offsetBalance))},
              saving you approximately {formatCompactCurrency(mortgageData.monthlySavingsFromOffset * 12)} per year in interest.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
