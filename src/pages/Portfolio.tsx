import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AllocationChart } from '@/components/charts/AllocationChart';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatChange } from '@/lib/format';
import { useLatestBalances, useWealthSnapshots, useBalances } from '@/hooks/useWealthData';
import { TrendingUp, Wallet } from 'lucide-react';
import { LiquidityTrendChart } from '@/components/charts/LiquidityTrendChart';
import { TimeRangeSelector, TimeRange, filterByTimeRange } from '@/components/dashboard/TimeRangeSelector';
import { DataCoverageBadge } from '@/components/dashboard/DataCoverageBadge';
import { AllocationToggle, AllocationMode } from '@/components/dashboard/AllocationToggle';
import { EnhancedStatCard } from '@/components/dashboard/EnhancedStatCard';

export default function Portfolio() {
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('accessible');
  
  const accountsWithBalances = useLatestBalances();
  const { snapshots, isLoading } = useWealthSnapshots();
  const { data: balances } = useBalances();

  // Filter snapshots by time range
  const filteredSnapshots = useMemo(() => {
    return filterByTimeRange(snapshots, timeRange);
  }, [snapshots, timeRange]);

  const latestSnapshot = filteredSnapshots.length > 0 ? filteredSnapshots[filteredSnapshots.length - 1] : null;
  const previousSnapshot = filteredSnapshots.length > 1 ? filteredSnapshots[filteredSnapshots.length - 2] : null;

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

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
            <p className="text-muted-foreground">Investment accounts and crypto</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-[300px]" /></CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-[300px]" /></CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  // If no data, show empty state
  if (!latestSnapshot || accountsWithBalances.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
            <p className="text-muted-foreground">Investment accounts and crypto</p>
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

  // Filter to investment and crypto accounts
  const investmentAccounts = accountsWithBalances.filter(
    a => a.account_type === 'investment' && a.latestBalance
  );
  const cryptoAccounts = accountsWithBalances.filter(
    a => a.account_type === 'crypto' && a.latestBalance
  );
  const retirementAccounts = accountsWithBalances.filter(
    a => a.account_type === 'retirement' && a.latestBalance
  );

  // Calculate totals
  const totalInvestments = investmentAccounts.reduce((sum, a) => sum + (a.latestBalance?.amount_aud || 0), 0);
  const totalCrypto = cryptoAccounts.reduce((sum, a) => sum + (a.latestBalance?.amount_aud || 0), 0);
  const totalRetirement = retirementAccounts.reduce((sum, a) => sum + (a.latestBalance?.amount_aud || 0), 0);
  
  const accessibleTotal = totalInvestments + totalCrypto;
  const totalPortfolio = accessibleTotal + totalRetirement;

  // Calculate MoM
  const prevAccessible = previousSnapshot
    ? previousSnapshot.investmentsAud + previousSnapshot.cryptoAud
    : null;
  const accessibleMoM = prevAccessible !== null
    ? formatChange(accessibleTotal, prevAccessible)
    : null;

  // Create allocation data based on mode
  const allocationData = allocationMode === 'accessible'
    ? [
        ...investmentAccounts.map((acc, i) => ({
          name: acc.name,
          value: acc.latestBalance?.amount_aud || 0,
          color: `hsl(${220 + i * 30}, 70%, 50%)`,
        })),
        ...cryptoAccounts.map((acc, i) => ({
          name: acc.name,
          value: acc.latestBalance?.amount_aud || 0,
          color: `hsl(${38 + i * 40}, 80%, 50%)`,
        })),
      ]
    : [
        ...investmentAccounts.map((acc, i) => ({
          name: acc.name,
          value: acc.latestBalance?.amount_aud || 0,
          color: `hsl(${220 + i * 30}, 70%, 50%)`,
        })),
        ...cryptoAccounts.map((acc, i) => ({
          name: acc.name,
          value: acc.latestBalance?.amount_aud || 0,
          color: `hsl(${38 + i * 40}, 80%, 50%)`,
        })),
        ...retirementAccounts.map((acc, i) => ({
          name: acc.name,
          value: acc.latestBalance?.amount_aud || 0,
          color: `hsl(${280 + i * 30}, 65%, 55%)`,
        })),
        // Add home and business from snapshot
        ...(latestSnapshot.homeValue > 0 ? [{ 
          name: 'Real Estate', 
          value: latestSnapshot.homeValue, 
          color: 'hsl(var(--chart-5))' 
        }] : []),
        ...(latestSnapshot.businessValue > 0 ? [{ 
          name: 'Business', 
          value: latestSnapshot.businessValue, 
          color: 'hsl(var(--primary))' 
        }] : []),
      ];

  const allocationTitle = allocationMode === 'accessible'
    ? 'Accessible Portfolio Allocation'
    : 'Total Household Allocation';

  const allocationDescription = allocationMode === 'accessible'
    ? 'Investments + Crypto only (excludes retirement, home, business)'
    : 'All assets including retirement, real estate, and business';

  // Liquidity trend data
  const liquidityTrendData = filteredSnapshots.map(s => ({
    date: s.date,
    liquid: s.liquidWealth,
    illiquid: s.illiquidWealth,
    liquidityPercent: s.liquidityPercent,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
            <p className="text-muted-foreground">Investment accounts and crypto</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <DataCoverageBadge
              firstDate={firstDate}
              lastDate={lastDate}
              warnings={fxWarnings}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <EnhancedStatCard
            title="Accessible Portfolio"
            value={formatCurrency(accessibleTotal, 'AUD', { compact: true })}
            asOfDate={latestSnapshot.date}
            includes="Investments + Crypto"
            momDelta={accessibleMoM ? { value: accessibleMoM.formatted, isPositive: accessibleMoM.isPositive } : undefined}
            icon={<Wallet className="h-5 w-5" />}
            variant="primary"
          />
          <EnhancedStatCard
            title="Retirement"
            value={formatCurrency(totalRetirement, 'AUD', { compact: true })}
            asOfDate={latestSnapshot.date}
            includes="Super + Roth IRA"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <EnhancedStatCard
            title="Total Portfolio"
            value={formatCurrency(totalPortfolio, 'AUD', { compact: true })}
            asOfDate={latestSnapshot.date}
            includes="Investments + Crypto + Retirement"
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <AllocationToggle value={allocationMode} onChange={setAllocationMode} />
            <p className="text-sm text-muted-foreground">{allocationDescription}</p>
          </div>
          <AllocationChart 
            data={allocationData} 
            title={allocationTitle}
            total={allocationMode === 'accessible' ? accessibleTotal : totalPortfolio + latestSnapshot.homeValue + latestSnapshot.businessValue}
          />
        </div>

        <LiquidityTrendChart data={liquidityTrendData} title="Liquid vs Illiquid Trend" />
      </div>
    </AppLayout>
  );
}
