import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatPercent } from '@/lib/format';
import { Flame, Target, Calendar, TrendingUp } from 'lucide-react';

export default function Fire() {
  const annualSpend = 210564;
  const fireMultiple = 25;
  const fireNumber = annualSpend * fireMultiple;
  const investableAssets = 1062972;
  const fireProgress = investableAssets / fireNumber;
  const fireRunway = investableAssets / annualSpend;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FIRE Calculator</h1>
          <p className="text-muted-foreground">Financial Independence, Retire Early</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Annual Spend"
            value={formatCurrency(annualSpend, 'AUD', { compact: true })}
            subtitle="Rolling 12-month"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            title="FIRE Number"
            value={formatCurrency(fireNumber, 'AUD', { compact: true })}
            subtitle={`${fireMultiple}x annual spend`}
            icon={<Target className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Investable Assets"
            value={formatCurrency(investableAssets, 'AUD', { compact: true })}
            subtitle="Liquid wealth"
            icon={<Flame className="h-5 w-5" />}
          />
          <StatCard
            title="FIRE Runway"
            value={`${fireRunway.toFixed(1)} years`}
            subtitle="At current spend rate"
            icon={<Calendar className="h-5 w-5" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>FIRE Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>{formatCurrency(investableAssets, 'AUD')}</span>
              <span className="text-muted-foreground">{formatCurrency(fireNumber, 'AUD')}</span>
            </div>
            <Progress value={fireProgress * 100} className="h-4" />
            <p className="text-center text-2xl font-bold">{formatPercent(fireProgress)} to FIRE</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
