import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Legend } from 'recharts';
import { formatCompactCurrency } from '@/lib/format';
import { FireMetrics } from '@/hooks/useFireCalculations';
import { PieChart } from 'lucide-react';

interface FireSpendingBreakdownProps {
  metrics: FireMetrics;
}

export function FireSpendingBreakdown({ metrics }: FireSpendingBreakdownProps) {
  const data = useMemo(() => [
    { name: 'Fixed', value: metrics.fixedSpend, fill: 'hsl(var(--primary))' },
    { name: 'Variable', value: metrics.variableSpend, fill: 'hsl(var(--muted-foreground))' },
  ], [metrics]);

  const chartConfig = {
    fixed: { label: 'Fixed', color: 'hsl(var(--primary))' },
    variable: { label: 'Variable', color: 'hsl(var(--muted-foreground))' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieChart className="h-5 w-5" />
          Fixed vs Variable Spend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <div className="text-xs text-muted-foreground">Fixed</div>
            <div className="font-semibold text-lg">{formatCompactCurrency(metrics.fixedSpend)}</div>
            <div className="text-xs text-muted-foreground">{metrics.fixedPercent.toFixed(0)}%</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Variable</div>
            <div className="font-semibold text-lg">{formatCompactCurrency(metrics.variableSpend)}</div>
            <div className="text-xs text-muted-foreground">{(100 - metrics.fixedPercent).toFixed(0)}%</div>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <Bar dataKey="value" radius={4}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <p className="text-xs text-muted-foreground mt-3">
          Fixed: Mortgage, rent, insurance, school fees, subscriptions.
          <br />
          Variable: Food, travel, discretionary spending.
        </p>
      </CardContent>
    </Card>
  );
}
