import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { formatCompactCurrency } from '@/lib/format';
import { PieChart } from 'lucide-react';

interface AssetValues {
  investmentsAud: number;
  cryptoAud: number;
  homeValue: number;
  businessValue: number;
  cashAud: number;
  retirementAud: number;
}

interface AssetBreakdownProjectionProps {
  startingValues: AssetValues;
  monthlyContribution: number;
  sharesReturn: number;
  cryptoReturn: number;
  propertyGrowth: number;
}

export function AssetBreakdownProjection({
  startingValues,
  monthlyContribution,
  sharesReturn,
  cryptoReturn,
  propertyGrowth,
}: AssetBreakdownProjectionProps) {
  const projectionData = useMemo(() => {
    const monthlySharesReturn = Math.pow(1 + sharesReturn / 100, 1 / 12) - 1;
    const monthlyCryptoReturn = Math.pow(1 + cryptoReturn / 100, 1 / 12) - 1;
    const monthlyPropertyGrowth = Math.pow(1 + propertyGrowth / 100, 1 / 12) - 1;

    const data = [];
    const now = new Date();

    let investments = startingValues.investmentsAud;
    let crypto = startingValues.cryptoAud;
    let property = startingValues.homeValue + startingValues.businessValue;
    let cash = startingValues.cashAud;
    let retirement = startingValues.retirementAud;

    for (let month = 0; month <= 60; month++) {
      const date = new Date(now.getFullYear(), now.getMonth() + month, 1);

      data.push({
        month,
        label: date.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
        investments,
        crypto,
        property,
        cash,
        retirement,
      });

      // Apply growth
      investments = investments * (1 + monthlySharesReturn) + monthlyContribution * 0.7;
      crypto = crypto * (1 + monthlyCryptoReturn);
      property = property * (1 + monthlyPropertyGrowth);
      cash = cash + monthlyContribution * 0.3;
      retirement = retirement * (1 + monthlySharesReturn * 0.8);
    }

    return data;
  }, [startingValues, monthlyContribution, sharesReturn, cryptoReturn, propertyGrowth]);

  const chartConfig = {
    investments: { label: 'Investments', color: 'hsl(var(--chart-1))' },
    crypto: { label: 'Crypto', color: 'hsl(var(--chart-2))' },
    property: { label: 'Property', color: 'hsl(var(--chart-3))' },
    cash: { label: 'Cash', color: 'hsl(var(--chart-4))' },
    retirement: { label: 'Retirement', color: 'hsl(var(--chart-5))' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="h-4 w-4" />
          Asset Class Breakdown Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={11}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactCurrency(value)}
                tick={{ fontSize: 11 }}
                width={70}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCompactCurrency(value as number)}
                  />
                }
              />
              <Area type="monotone" dataKey="property" stackId="1" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.6} />
              <Area type="monotone" dataKey="retirement" stackId="1" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5))" fillOpacity={0.6} />
              <Area type="monotone" dataKey="investments" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.6} />
              <Area type="monotone" dataKey="crypto" stackId="1" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} />
              <Area type="monotone" dataKey="cash" stackId="1" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
          {Object.entries(chartConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: config.color }}
              />
              <span className="text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
