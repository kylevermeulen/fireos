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
import { formatCurrency, formatChange } from '@/lib/format';
import { useWealthSnapshots, useBalances, useAccounts } from '@/hooks/useWealthData';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalTimeRange, filterByTimeRange } from '@/contexts/TimeRangeContext';
import { Wallet, TrendingUp, PiggyBank, Landmark, Upload, Database } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function Index() {
  const { timeRange, customDateRange } = useGlobalTimeRange();
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('accessible');
  
  const { sessionReady, user } = useAuth();
  const { snapshots, isLoading: snapshotsLoading } = useWealthSnapshots();
  const { data: balances, isLoading: balancesLoading } = useBalances();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();

  // Only block on session — let individual sections handle their own loading
  const isLoading = !sessionReady;

  // Filter snapshots by time range
  const filteredSnapshots = useMemo(() => {
    return filterByTimeRange(snapshots, timeRange, customDateRange);
  }, [snapshots, timeRange, customDateRange]);

  // Get latest and previous from filtered data
  const latestSnapshot = filteredSnapshots.length > 0 ? filteredSnapshots[filteredSnapshots.length - 1] : null;
  const previousSnapshot = filteredSnapshots.length > 1 ? filteredSnapshots[filteredSnapshots.length - 2] : null;

  // Check for FX warnings (balances with null AUD)
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
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

  // State machine for empty states
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

  // If no data after all checks, show generic empty
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
              <h3 className="text-lg font-medium mb-2">No Data Yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Import your financial data via Settings to see your dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Calculate MoM deltas
  const netWorthMoM = previousSnapshot
    ? formatChange(latestSnapshot.netWorth, previousSnapshot.netWorth)
    : null;

  const accessibleWealth = latestSnapshot.investmentsAud + latestSnapshot.cryptoAud;
  const prevAccessibleWealth = previousSnapshot
    ? previousSnapshot.investmentsAud + previousSnapshot.cryptoAud
    : null;
  const accessibleMoM = prevAccessibleWealth !== null
    ? formatChange(accessibleWealth, prevAccessibleWealth)
    : null;

  const liabilitiesMoM = previousSnapshot
    ? formatChange(latestSnapshot.totalLiabilities, previousSnapshot.totalLiabilities)
    : null;

  // Prepare chart data
  const netWorthChartData = filteredSnapshots.map(s => ({
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <EnhancedStatCard
            title="Net Worth"
            value={formatCurrency(latestSnapshot.netWorth, 'AUD', { compact: true })}
            asOfDate={latestSnapshot.date}
            includes="All assets minus all liabilities"
            momDelta={netWorthMoM ? { value: netWorthMoM.formatted, isPositive: netWorthMoM.isPositive } : undefined}
            icon={<TrendingUp className="h-5 w-5" />}
            variant="primary"
          />
          <EnhancedStatCard
            title="Accessible Wealth"
            value={formatCurrency(accessibleWealth, 'AUD', { compact: true })}
            asOfDate={latestSnapshot.date}
            includes="Investments + Crypto only"
            momDelta={accessibleMoM ? { value: accessibleMoM.formatted, isPositive: accessibleMoM.isPositive } : undefined}
            icon={<Wallet className="h-5 w-5" />}
          />
          <EnhancedStatCard
            title="Total Assets"
            value={formatCurrency(latestSnapshot.totalAssets, 'AUD', { compact: true })}
            asOfDate={latestSnapshot.date}
            includes="Cash, investments, retirement, crypto, home, business"
            icon={<PiggyBank className="h-5 w-5" />}
          />
          <EnhancedStatCard
            title="Total Liabilities"
            value={formatCurrency(latestSnapshot.totalLiabilities, 'AUD', { compact: true })}
            asOfDate={latestSnapshot.date}
            includes="Mortgages + loans"
            subtitle={`Net of offset: ${formatCurrency(latestSnapshot.mortgageNetOfOffset, 'AUD', { compact: true })}`}
            momDelta={liabilitiesMoM ? { 
              value: liabilitiesMoM.formatted, 
              isPositive: liabilitiesMoM.value < 0 // Decreasing liabilities is positive
            } : undefined}
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
