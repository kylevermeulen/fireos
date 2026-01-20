import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AllocationChart } from '@/components/charts/AllocationChart';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { useLatestBalances, useWealthSnapshots } from '@/hooks/useWealthData';
import { TrendingUp, Wallet } from 'lucide-react';
import { LiquidityTrendChart } from '@/components/charts/LiquidityTrendChart';

export default function Portfolio() {
  const accountsWithBalances = useLatestBalances();
  const { snapshots, latestSnapshot, isLoading } = useWealthSnapshots();

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

  // Create chart data
  const investmentData = investmentAccounts.map((acc, i) => ({
    name: acc.name,
    value: acc.latestBalance?.amount_aud || 0,
    color: `hsl(${220 + i * 30}, 70%, 50%)`,
  }));

  const cryptoData = cryptoAccounts.map((acc, i) => ({
    name: acc.name,
    value: acc.latestBalance?.amount_aud || 0,
    color: `hsl(${38 + i * 40}, 80%, 50%)`,
  }));

  const retirementData = retirementAccounts.map((acc, i) => ({
    name: acc.name,
    value: acc.latestBalance?.amount_aud || 0,
    color: `hsl(${280 + i * 30}, 65%, 55%)`,
  }));

  const totalInvestments = investmentAccounts.reduce((sum, a) => sum + (a.latestBalance?.amount_aud || 0), 0);
  const totalCrypto = cryptoAccounts.reduce((sum, a) => sum + (a.latestBalance?.amount_aud || 0), 0);
  const totalRetirement = retirementAccounts.reduce((sum, a) => sum + (a.latestBalance?.amount_aud || 0), 0);

  // Liquidity trend data
  const liquidityTrendData = snapshots.map(s => ({
    date: s.date,
    liquid: s.liquidWealth,
    illiquid: s.illiquidWealth,
    liquidityPercent: s.liquidityPercent,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground">Investment accounts and crypto</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Investments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInvestments, 'AUD', { compact: true })}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Crypto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCrypto, 'AUD', { compact: true })}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Retirement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRetirement, 'AUD', { compact: true })}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {investmentData.length > 0 && (
            <AllocationChart data={investmentData} title="Investment Allocation" />
          )}
          {cryptoData.length > 0 && (
            <AllocationChart data={cryptoData} title="Crypto Allocation" />
          )}
        </div>

        {retirementData.length > 0 && (
          <AllocationChart data={retirementData} title="Retirement Accounts" />
        )}

        <LiquidityTrendChart data={liquidityTrendData} title="Liquid vs Illiquid Trend" />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Total Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(totalInvestments + totalCrypto + totalRetirement, 'AUD')}
            </div>
            <p className="text-muted-foreground">Investments + Crypto + Retirement combined</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
