import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/format';
import { FireMetrics } from '@/hooks/useFireCalculations';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, DollarSign } from 'lucide-react';

interface FireCashflowSummaryProps {
  metrics: FireMetrics;
  monthsInRange: number;
}

export function FireCashflowSummary({ metrics, monthsInRange }: FireCashflowSummaryProps) {
  const avgMonthlyIncome = metrics.totalIncome / monthsInRange;
  const avgMonthlyNet = metrics.netSurplus / monthsInRange;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5" />
          Cashflow Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
            <span className="text-sm">Total Income</span>
          </div>
          <span className="font-semibold">{formatCompactCurrency(metrics.totalIncome)}</span>
        </div>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-red-500" />
            <span className="text-sm">Total Spending</span>
          </div>
          <span className="font-semibold">{formatCompactCurrency(metrics.totalSpending)}</span>
        </div>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center gap-2">
            <TrendingUp className={`h-4 w-4 ${metrics.netSurplus >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
            <span className="text-sm">Net Surplus</span>
          </div>
          <span className={`font-semibold ${metrics.netSurplus >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCompactCurrency(metrics.netSurplus)}
          </span>
        </div>

        <div className="pt-2 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Avg Monthly Income</span>
            <span>{formatCompactCurrency(avgMonthlyIncome)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Avg Monthly Spend</span>
            <span>{formatCompactCurrency(metrics.avgMonthlySpend)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Avg Monthly Surplus</span>
            <span className={avgMonthlyNet >= 0 ? 'text-emerald-600' : 'text-red-600'}>
              {formatCompactCurrency(avgMonthlyNet)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
