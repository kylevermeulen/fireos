import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccounts, useBalances } from '@/hooks/useWealthData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompactCurrency, formatDate, formatPercent } from '@/lib/format';
import { Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { GlobalTimeRangeSelector } from '@/components/dashboard/GlobalTimeRangeSelector';
import { useGlobalTimeRange, filterByTimeRange } from '@/contexts/TimeRangeContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Retirement() {
  const { timeRange, customDateRange } = useGlobalTimeRange();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: balances, isLoading: balancesLoading } = useBalances();

  const isLoading = accountsLoading || balancesLoading;

  const retirementData = useMemo(() => {
    if (!accounts || !balances) {
      return null;
    }

    // Get retirement accounts only
    const retirementAccounts = accounts.filter(a => a.account_type === 'retirement');

    if (retirementAccounts.length === 0) {
      return null;
    }

    // Create balance snapshots with dates
    const accountIds = new Set(retirementAccounts.map(a => a.id));
    const relevantBalances = balances.filter(b => accountIds.has(b.account_id));

    // Get all unique dates for retirement balances
    const dateSet = new Set(relevantBalances.map(b => b.balance_date));
    const allDates = Array.from(dateSet).sort();

    // Build snapshots per date
    const snapshots = allDates.map(date => {
      const dateBalances = relevantBalances.filter(b => b.balance_date === date);
      const total = dateBalances.reduce((sum, b) => sum + b.amount_aud, 0);
      return { date, total };
    });

    // Filter by time range
    const filteredSnapshots = filterByTimeRange(snapshots, timeRange, customDateRange);

    // Get start and end values
    const startSnapshot = filteredSnapshots[0];
    const endSnapshot = filteredSnapshots[filteredSnapshots.length - 1];

    const totalBalance = endSnapshot?.total || 0;
    const startBalance = startSnapshot?.total || 0;
    const delta = totalBalance - startBalance;
    const deltaPercent = startBalance > 0 ? delta / startBalance : 0;
    const latestDate = endSnapshot?.date || '';

    // Get latest balance per account
    const latestByAccount = new Map<string, { balance: number; date: string }>();
    const startByAccount = new Map<string, { balance: number; date: string }>();

    for (const balance of relevantBalances) {
      if (endSnapshot && balance.balance_date === endSnapshot.date) {
        latestByAccount.set(balance.account_id, { balance: balance.amount_aud, date: balance.balance_date });
      }
      if (startSnapshot && balance.balance_date === startSnapshot.date) {
        startByAccount.set(balance.account_id, { balance: balance.amount_aud, date: balance.balance_date });
      }
    }

    // Build account details
    const accountDetails = retirementAccounts.map(account => {
      const latest = latestByAccount.get(account.id);
      const start = startByAccount.get(account.id);
      const balance = latest?.balance || 0;
      const startBalance = start?.balance || 0;
      const delta = balance - startBalance;

      return {
        id: account.id,
        name: account.name,
        institution: account.institution,
        country: account.country,
        balance,
        delta,
        date: latest?.date || '',
      };
    }).sort((a, b) => b.balance - a.balance);

    return {
      totalBalance,
      delta,
      deltaPercent,
      latestDate,
      accountDetails,
      snapshots: filteredSnapshots,
    };
  }, [accounts, balances, timeRange, customDateRange]);

  const timeRangeLabel = timeRange === 'custom' ? 'Period' : timeRange;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Retirement</h1>
              <p className="text-muted-foreground">Superannuation & retirement accounts</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!retirementData) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Retirement</h1>
            <p className="text-muted-foreground">Superannuation & retirement accounts</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Landmark className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Retirement Accounts</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Add retirement accounts (superannuation, 401k, Roth IRA) to track your retirement savings.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const isPositive = retirementData.delta >= 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Retirement</h1>
            <p className="text-muted-foreground">Superannuation & retirement accounts</p>
          </div>
          <GlobalTimeRangeSelector />
        </div>

        {/* Top stat cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Retirement</p>
                  <p className="text-2xl font-bold">{formatCompactCurrency(retirementData.totalBalance)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    As of {formatDate(retirementData.latestDate, 'short')}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Landmark className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Change ({timeRangeLabel})</p>
                  <p className={`text-2xl font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                    {isPositive ? '+' : ''}{formatCompactCurrency(retirementData.delta)}
                  </p>
                  <p className={`text-xs mt-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
                    {isPositive ? '+' : ''}{formatPercent(retirementData.deltaPercent)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  {isPositive ? (
                    <TrendingUp className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Retirement Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Balance (AUD)</TableHead>
                  <TableHead className="text-right">Change ({timeRangeLabel})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retirementData.accountDetails.map((account) => {
                  const isAccountPositive = account.delta >= 0;
                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{account.name}</span>
                          <span className="text-xs text-muted-foreground">Retirement</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCompactCurrency(account.balance)}
                      </TableCell>
                      <TableCell className={`text-right ${isAccountPositive ? 'text-success' : 'text-destructive'}`}>
                        {isAccountPositive ? '+' : ''}{formatCompactCurrency(account.delta)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Retirement accounts are excluded from "Accessible" portfolio totals as they have withdrawal restrictions.
              These include superannuation (Australia), 401k, and Roth IRA (USA).
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
