import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NetWorthChart } from '@/components/charts/NetWorthChart';

const projectionData = [
  { date: '2025-01-01', netWorth: 8491225, liquid: 1291351, illiquid: 7199874 },
  { date: '2026-01-01', netWorth: 9200000, liquid: 1500000, illiquid: 7700000 },
  { date: '2027-01-01', netWorth: 10100000, liquid: 1750000, illiquid: 8350000 },
  { date: '2028-01-01', netWorth: 11200000, liquid: 2050000, illiquid: 9150000 },
  { date: '2029-01-01', netWorth: 12500000, liquid: 2400000, illiquid: 10100000 },
  { date: '2030-01-01', netWorth: 14000000, liquid: 2800000, illiquid: 11200000 },
];

export default function Projections() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projections</h1>
          <p className="text-muted-foreground">5-year wealth forecast</p>
        </div>

        <NetWorthChart data={projectionData} title="5-Year Net Worth Projection (Base Scenario)" />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Conservative</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">$12.1M</p>
              <p className="text-sm text-muted-foreground">by 2030</p>
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardHeader><CardTitle className="text-base">Base</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">$14.0M</p>
              <p className="text-sm text-muted-foreground">by 2030</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Aggressive</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">$16.5M</p>
              <p className="text-sm text-muted-foreground">by 2030</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
