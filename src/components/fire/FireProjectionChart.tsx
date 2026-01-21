import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, ResponsiveContainer } from 'recharts';
import { formatCompactCurrency } from '@/lib/format';
import { TrendingUp } from 'lucide-react';

interface FireProjectionChartProps {
  investableAssets: number;
  fiNumber: number;
  monthlyContribution: number;
  realReturnPercent: number;
}

export function FireProjectionChart({
  investableAssets,
  fiNumber,
  monthlyContribution,
  realReturnPercent,
}: FireProjectionChartProps) {
  const projectionData = useMemo(() => {
    const monthlyReturn = realReturnPercent / 100 / 12;
    const data = [];
    let currentValue = investableAssets;
    const now = new Date();

    for (let month = 0; month <= 60; month++) {
      const date = new Date(now.getFullYear(), now.getMonth() + month, 1);
      data.push({
        month,
        date: date.toISOString(),
        label: date.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
        value: currentValue,
        fiNumber: fiNumber,
      });
      
      // Compound growth + contribution
      currentValue = currentValue * (1 + monthlyReturn) + monthlyContribution;
    }

    return data;
  }, [investableAssets, fiNumber, monthlyContribution, realReturnPercent]);

  // Find milestone values
  const year1 = projectionData.find(d => d.month === 12)?.value ?? 0;
  const year3 = projectionData.find(d => d.month === 36)?.value ?? 0;
  const year5 = projectionData.find(d => d.month === 60)?.value ?? 0;

  const chartConfig = {
    value: {
      label: 'Projected Wealth',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          5-Year Projection
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Milestone cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Today</div>
            <div className="font-semibold">{formatCompactCurrency(investableAssets)}</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">1 Year</div>
            <div className="font-semibold">{formatCompactCurrency(year1)}</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">3 Years</div>
            <div className="font-semibold">{formatCompactCurrency(year3)}</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">5 Years</div>
            <div className="font-semibold">{formatCompactCurrency(year5)}</div>
          </div>
        </div>

        {/* Chart */}
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={11}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactCurrency(value)}
                tick={{ fontSize: 12 }}
                width={80}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCompactCurrency(value as number)}
                  />
                }
              />
              <ReferenceLine
                y={fiNumber}
                stroke="hsl(var(--destructive))"
                strokeDasharray="5 5"
                label={{
                  value: `FI: ${formatCompactCurrency(fiNumber)}`,
                  position: 'right',
                  fontSize: 12,
                  fill: 'hsl(var(--destructive))',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#projectionGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Projection assumes {realReturnPercent}% real return and current monthly contribution of {formatCompactCurrency(monthlyContribution)}/mo
        </p>
      </CardContent>
    </Card>
  );
}
