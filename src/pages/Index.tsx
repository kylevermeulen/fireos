import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { NetWorthChart } from '@/components/charts/NetWorthChart';
import { AllocationChart } from '@/components/charts/AllocationChart';
import { formatCurrency, formatPercent, formatChange } from '@/lib/format';
import { useWealthSnapshots } from '@/hooks/useWealthData';
import { Wallet, TrendingUp, PiggyBank, Home, Building2, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Index() {
  const { snapshots, latestSnapshot, previousSnapshot, isLoading } = useWealthSnapshots();

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
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // If no data, show empty state
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
                Go to Settings to seed your accounts and import your historical balance snapshots.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Calculate changes
  const netWorthChange = previousSnapshot 
    ? formatChange(latestSnapshot.netWorth, previousSnapshot.netWorth)
    : null;

  const liquidChange = previousSnapshot
    ? formatChange(latestSnapshot.liquidWealth, previousSnapshot.liquidWealth)
    : null;

  // Prepare chart data
  const netWorthChartData = snapshots.map(s => ({
    date: s.date,
    netWorth: s.netWorth,
    liquid: s.liquidWealth,
    illiquid: s.illiquidWealth,
  }));

  // Allocation data for pie chart
  const allocationData = [
    { name: 'Cash', value: latestSnapshot.cashAud, color: 'hsl(var(--chart-1))' },
    { name: 'Investments', value: latestSnapshot.investmentsAud, color: 'hsl(var(--chart-2))' },
    { name: 'Retirement', value: latestSnapshot.retirementAud, color: 'hsl(var(--chart-3))' },
    { name: 'Crypto', value: latestSnapshot.cryptoAud, color: 'hsl(var(--chart-4))' },
    { name: 'Real Estate', value: latestSnapshot.homeValue, color: 'hsl(var(--chart-5))' },
    { name: 'Business', value: latestSnapshot.businessValue, color: 'hsl(var(--primary))' },
  ].filter(d => d.value > 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Household wealth overview</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Net Worth"
            value={formatCurrency(latestSnapshot.netWorth, 'AUD', { compact: true })}
            change={netWorthChange ? { value: netWorthChange.formatted, isPositive: netWorthChange.isPositive } : undefined}
            icon={<TrendingUp className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Liquid Wealth"
            value={formatCurrency(latestSnapshot.liquidWealth, 'AUD', { compact: true })}
            change={liquidChange ? { value: liquidChange.formatted, isPositive: liquidChange.isPositive } : undefined}
            subtitle={`${formatPercent(latestSnapshot.liquidityPercent)} of net worth`}
            icon={<Wallet className="h-5 w-5" />}
          />
          <StatCard
            title="Total Assets"
            value={formatCurrency(latestSnapshot.totalAssets, 'AUD', { compact: true })}
            icon={<PiggyBank className="h-5 w-5" />}
          />
          <StatCard
            title="Total Liabilities"
            value={formatCurrency(latestSnapshot.totalLiabilities, 'AUD', { compact: true })}
            subtitle={`Mortgage net of offset: ${formatCurrency(latestSnapshot.mortgageNetOfOffset, 'AUD', { compact: true })}`}
            icon={<Landmark className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <NetWorthChart data={netWorthChartData} title="Net Worth Trend" />
          <AllocationChart data={allocationData} title="Asset Allocation" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Real Estate"
            value={formatCurrency(latestSnapshot.homeValue, 'AUD', { compact: true })}
            icon={<Home className="h-5 w-5" />}
          />
          <StatCard
            title="Business Value"
            value={formatCurrency(latestSnapshot.businessValue, 'AUD', { compact: true })}
            icon={<Building2 className="h-5 w-5" />}
          />
          <StatCard
            title="Investments + Retirement"
            value={formatCurrency(latestSnapshot.investmentsAud + latestSnapshot.retirementAud, 'AUD', { compact: true })}
            subtitle={`Retirement: ${formatCurrency(latestSnapshot.retirementAud, 'AUD', { compact: true })}`}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>
      </div>
    </AppLayout>
  );
}
