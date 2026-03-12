import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { EnhancedStatCard } from '@/components/dashboard/EnhancedStatCard';
import { GlobalTimeRangeSelector } from '@/components/dashboard/GlobalTimeRangeSelector';
import { DataCoverageBadge } from '@/components/dashboard/DataCoverageBadge';
import { AllocationToggle, AllocationMode } from '@/components/dashboard/AllocationToggle';
import { AccountsMovement } from '@/components/dashboard/AccountsMovement';
import { NetWorthChart } from '@/components/charts/NetWorthChart';
import { AllocationChart } from '@/components/charts/AllocationChart';
import { formatCurrency, formatCompactCurrency } from '@/lib/format';
import { useWealthSnapshots, useBalances, useAccounts } from '@/hooks/useWealthData';
import { useDashboardCashflow } from '@/hooks/useDashboardCashflow';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalTimeRange, filterByTimeRange } from '@/contexts/TimeRangeContext';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Landmark, Upload, Database, ArrowDownUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function Index() {
  const { timeRange, customDateRange, effectiveDateRange } = useGlobalTimeRange();
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('accessible');
  
  const { sessionReady, user } = useAuth();
  const { snapshots, isLoading: snapshotsLoading } = useWealthSnapshots();
  const { data: balances, isLoading: balancesLoading } = useBalances();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: cashflowData } = useDashboardCashflow(effectiveDateRange);

  const isLoading = !sessionReady || snapshotsLoading || balancesLoading || accountsLoading;

  // Filter snapshots by time range
  const filteredSnapshots = useMemo(() => {
    return filterByTimeRange(snapshots, timeRange, customDateRange);
  }, [snapshots, timeRange, customDateRange]);

  // Use filtered data for display, but fall back to all snapshots if filter is too narrow
  const displaySnapshots = filteredSnapshots.length > 0 ? filteredSnapshots : snapshots;
  const latestSnapshot = displaySnapshots.length > 0 ? displaySnapshots[displaySnapshots.length - 1] : null;

  // Check for FX warnings
  const fxWarnings = useMemo(() => {
    if (!balances) return [];
    const warnings: string[] = [];
    const nullAudBalances = balances.filter(b => b.amount_aud === 0 && b.amount_native !== 0);
    if (nullAudBalances.length > 0) {
      warnings.push(`FX missing for ${nullAudBalances.length} balance(s)`);
    }
    return warnings;
  }, [balances]);

  // Data coverage dates
  const firstDate = snapshots.length > 0 ? snapshots[0].date : null;
  const lastDate = snapshots.length > 0 ? snapshots[snapshots.length - 1].date : null;

  // Mortgage offset calculation (must be before early returns)
  const offsetAccount = accounts?.find(a => a.name === 'Offset' && a.institution === 'Bank of Melbourne');
  const offsetBalance = useMemo(() => {
    if (!offsetAccount || !balances) return 0;
    const accountBalances = balances
      .filter(b => b.account_id === offsetAccount.id)
      .sort((a, b) => a.balance_date.localeCompare(b.balance_date));
    return accountBalances.length > 0 ? accountBalances[accountBalances.length - 1].amount_aud : 0;
  }, [offsetAccount, balances]);

  // Determine data state
  const hasAccounts = (accounts?.length ?? 0) > 0;
  const hasBalances = (balances?.length ?? 0) > 0;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Household wealth overview</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!hasAccounts) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Household wealth overview</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Accounts Configured</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                First, seed your accounts to set up your financial structure.
              </p>
              <Button asChild>
                <Link to="/settings">Go to Settings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!hasBalances) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Household wealth overview</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Accounts Ready — Import Snapshots</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                You have {accounts?.length} accounts configured. Import your snapshot CSV to populate balance history.
              </p>
              <Button asChild>
                <Link to="/settings">Import Snapshot CSV</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!latestSnapshot || snapshots.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Household wealth overview</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Processing Data</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Your data is being processed. Refresh the page if this persists.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // === Card 1: Net Worth Change ===
  const firstInRange = displaySnapshots[0];
  const lastInRange = displaySnapshots[displaySnapshots.length - 1];
  const netWorthDelta = lastInRange.netWorth - firstInRange.netWorth;
  const netWorthDeltaPositive = netWorthDelta >= 0;
  const netWorthDeltaFormatted = `${netWorthDeltaPositive ? '+' : ''}${formatCompactCurrency(netWorthDelta)}`;

  // === Card 2: Cash Flow ===
  const totalIncome = cashflowData?.totalIncome ?? 0;
  const totalSpending = cashflowData?.totalSpending ?? 0;
  const netCashflow = cashflowData?.netCashflow ?? 0;
  const cashflowPositive = netCashflow >= 0;

  // === Card 3: Mortgage Progress ===
  const offsetAccount = accounts?.find(a => a.name === 'Offset' && a.institution === 'Bank of Melbourne');
  const offsetBalance = useMemo(() => {
    if (!offsetAccount || !balances) return 0;
    const accountBalances = balances
      .filter(b => b.account_id === offsetAccount.id)
      .sort((a, b) => a.balance_date.localeCompare(b.balance_date));
    return accountBalances.length > 0 ? accountBalances[accountBalances.length - 1].amount_aud : 0;
  }, [offsetAccount, balances]);

  // Get total loan balance from liability data in snapshots
  const totalLoanBalance = latestSnapshot.mortgageBalance;
  const netMortgage = latestSnapshot.mortgageNetOfOffset;
  const offsetPercent = totalLoanBalance > 0 ? Math.round((offsetBalance / totalLoanBalance) * 100) : 0;

  // Chart data
  const netWorthChartData = displaySnapshots.map(s => ({
    date: s.date,
    netWorth: s.netWorth,
    liquid: s.liquidWealth,
    illiquid: s.illiquidWealth,
  }));

  // Allocation data based on mode
  const allocationData = allocationMode === 'accessible'
    ? [
        { name: 'Investments', value: latestSnapshot.investmentsAud, color: 'hsl(var(--chart-2))' },
        { name: 'Crypto', value: latestSnapshot.cryptoAud, color: 'hsl(var(--chart-4))' },
      ].filter(d => d.value > 0)
    : [
        { name: 'Cash', value: latestSnapshot.cashAud, color: 'hsl(var(--chart-1))' },
        { name: 'Investments', value: latestSnapshot.investmentsAud, color: 'hsl(var(--chart-2))' },
        { name: 'Retirement', value: latestSnapshot.retirementAud, color: 'hsl(var(--chart-3))' },
        { name: 'Crypto', value: latestSnapshot.cryptoAud, color: 'hsl(var(--chart-4))' },
        { name: 'Real Estate', value: latestSnapshot.homeValue, color: 'hsl(var(--chart-5))' },
        { name: 'Business', value: latestSnapshot.businessValue, color: 'hsl(var(--primary))' },
      ].filter(d => d.value > 0);

  const allocationTitle = allocationMode === 'accessible'
    ? 'Accessible Portfolio Allocation'
    : 'Total Household Allocation';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Household wealth overview</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <GlobalTimeRangeSelector />
            <DataCoverageBadge
              firstDate={firstDate}
              lastDate={lastDate}
              warnings={fxWarnings}
            />
          </div>
        </div>

        {/* Three KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Card 1: Net Worth Change */}
          <EnhancedStatCard
            title="Net Worth"
            value={netWorthDeltaFormatted}
            asOfDate={lastInRange.date}
            subtitle={`Current: ${formatCurrency(lastInRange.netWorth, 'AUD', { compact: true })}`}
            momDelta={undefined}
            icon={netWorthDeltaPositive 
              ? <TrendingUp className="h-5 w-5" /> 
              : <TrendingDown className="h-5 w-5" />}
            variant={netWorthDeltaPositive ? 'primary' : 'default'}
          />

          {/* Card 2: Cash Flow */}
          <EnhancedStatCard
            title="Cash Flow"
            value={`${cashflowPositive ? '+' : ''}${formatCompactCurrency(netCashflow)}`}
            asOfDate={lastInRange.date}
            subtitle={`Income ${formatCompactCurrency(totalIncome)} · Spending ${formatCompactCurrency(totalSpending)}`}
            icon={<ArrowDownUp className="h-5 w-5" />}
            variant={cashflowPositive ? 'success' : 'warning'}
          />

          {/* Card 3: Mortgage Progress */}
          <EnhancedStatCard
            title="Mortgage"
            value={`${offsetPercent}% covered by offset`}
            asOfDate={lastInRange.date}
            subtitle={`Offset ${formatCompactCurrency(offsetBalance)} · Loans ${formatCompactCurrency(totalLoanBalance)} · Net ${formatCompactCurrency(netMortgage)}`}
            icon={<Landmark className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <NetWorthChart data={netWorthChartData} title="Net Worth Trend" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <AllocationToggle value={allocationMode} onChange={setAllocationMode} />
            </div>
            <AllocationChart data={allocationData} title={allocationTitle} />
          </div>
        </div>

        <AccountsMovement timeRange={timeRange} />
      </div>
    </AppLayout>
  );
}
