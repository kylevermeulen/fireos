import { Card } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/format';
import { FireMetrics } from '@/hooks/useFireCalculations';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  Target,
  Clock 
} from 'lucide-react';

interface FireKpiStripProps {
  metrics: FireMetrics;
}

export function FireKpiStrip({ metrics }: FireKpiStripProps) {
  const kpis = [
    {
      label: 'Net Worth',
      value: formatCompactCurrency(metrics.netWorth),
      icon: Wallet,
      color: 'text-emerald-500',
    },
    {
      label: 'Investable Assets',
      value: formatCompactCurrency(metrics.investableAssets),
      icon: TrendingUp,
      color: 'text-blue-500',
    },
    {
      label: 'FI Number',
      value: formatCompactCurrency(metrics.fiNumber),
      icon: Target,
      color: 'text-amber-500',
    },
    {
      label: 'FI Progress',
      value: `${metrics.fiPercent.toFixed(1)}%`,
      icon: metrics.fiPercent >= 100 ? TrendingUp : TrendingDown,
      color: metrics.fiPercent >= 100 ? 'text-emerald-500' : 'text-primary',
    },
    {
      label: 'Savings Rate',
      value: `${metrics.savingsRate.toFixed(1)}%`,
      icon: PiggyBank,
      color: metrics.savingsRate >= 50 ? 'text-emerald-500' : 'text-amber-500',
    },
    {
      label: 'Runway',
      value: `${Math.round(metrics.runwayMonths)} mo`,
      icon: Clock,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            <span className="text-xs text-muted-foreground">{kpi.label}</span>
          </div>
          <div className="text-xl font-bold">{kpi.value}</div>
        </Card>
      ))}
    </div>
  );
}
