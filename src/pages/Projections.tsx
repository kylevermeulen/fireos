import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NetWorthChart } from '@/components/charts/NetWorthChart';
import { useWealthSnapshots } from '@/hooks/useWealthData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { Wallet } from 'lucide-react';

export default function Projections() {
  const { snapshots, latestSnapshot, isLoading } = useWealthSnapshots();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projections</h1>
            <p className="text-muted-foreground">Wealth forecast</p>
          </div>
          <Skeleton className="h-[400px]" />
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
            <h1 className="text-2xl font-bold tracking-tight">Projections</h1>
            <p className="text-muted-foreground">Wealth forecast</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Data Yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Import your historical data first to enable projections.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Historical data for the chart
  const historicalData = snapshots.map(s => ({
    date: s.date,
    netWorth: s.netWorth,
    liquid: s.liquidWealth,
    illiquid: s.illiquidWealth,
  }));

  // Simple projection: extend 5 years from last snapshot with growth rates
  const lastDate = new Date(latestSnapshot.date);
  const growthRate = 0.07; // 7% annual growth assumption
  
  const projectionData = [];
  for (let i = 1; i <= 5; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setFullYear(futureDate.getFullYear() + i);
    
    const multiplier = Math.pow(1 + growthRate, i);
    projectionData.push({
      date: futureDate.toISOString().split('T')[0],
      netWorth: Math.round(latestSnapshot.netWorth * multiplier),
      liquid: Math.round(latestSnapshot.liquidWealth * multiplier),
      illiquid: Math.round(latestSnapshot.illiquidWealth * multiplier),
    });
  }

  const allData = [...historicalData, ...projectionData];

  // Calculate targets
  const year5Projection = projectionData[projectionData.length - 1];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projections</h1>
          <p className="text-muted-foreground">5-year wealth forecast based on historical trends</p>
        </div>

        <NetWorthChart data={allData} title="Historical + Projected Net Worth" />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Net Worth</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(latestSnapshot.netWorth, 'AUD', { compact: true })}</p>
              <p className="text-sm text-muted-foreground">as of {new Date(latestSnapshot.date).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}</p>
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-base">5-Year Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(year5Projection.netWorth, 'AUD', { compact: true })}</p>
              <p className="text-sm text-muted-foreground">at 7% annual growth</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Growth Target</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">+{formatCurrency(year5Projection.netWorth - latestSnapshot.netWorth, 'AUD', { compact: true })}</p>
              <p className="text-sm text-muted-foreground">over 5 years</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Projection Assumptions</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>This is a simple projection using a 7% compound annual growth rate. Future versions will include:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Different growth rates by asset class (shares, crypto, property)</li>
              <li>Conservative / Base / Aggressive scenarios</li>
              <li>Monthly savings contributions</li>
              <li>Inflation adjustments</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
