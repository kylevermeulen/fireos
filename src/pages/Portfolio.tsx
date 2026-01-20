import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AllocationChart } from '@/components/charts/AllocationChart';
import { formatCurrency } from '@/lib/format';

export default function Portfolio() {
  const shareData = [
    { name: 'CommSec (ASX)', value: 520757, color: 'hsl(220, 70%, 50%)' },
    { name: 'RWBaird', value: 121629, color: 'hsl(142, 71%, 45%)' },
    { name: 'Vanguard', value: 104180, color: 'hsl(38, 92%, 50%)' },
  ];

  const cryptoData = [
    { name: 'CoinJar (AUD)', value: 106750, color: 'hsl(38, 92%, 50%)' },
    { name: 'Coinbase (USD)', value: 38557, color: 'hsl(280, 65%, 60%)' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground">Shares and crypto holdings</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AllocationChart data={shareData} title="Shares Allocation" />
          <AllocationChart data={cryptoData} title="Crypto Allocation" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Total Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(891873, 'AUD')}</div>
            <p className="text-muted-foreground">Shares + Crypto combined</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
