import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatCompactCurrency } from '@/lib/format';
import { TrendingUp } from 'lucide-react';

interface AssetValues {
  investmentsAud: number;
  cryptoAud: number;
  homeValue: number;
  businessValue: number;
  cashAud: number;
  retirementAud: number;
}

interface ProjectionChartProps {
  startingValues: AssetValues;
  monthlyContribution: number;
  sharesReturn: number;
  cryptoReturn: number;
  propertyGrowth: number;
  inflationRate: number;
  showInflationAdjusted: boolean;
}

export function ProjectionChart({
  startingValues,
  monthlyContribution,
  sharesReturn,
  cryptoReturn,
  propertyGrowth,
  inflationRate,
  showInflationAdjusted,
}: ProjectionChartProps) {
  const projectionData = useMemo(() => {
    const monthlySharesReturn = Math.pow(1 + sharesReturn / 100, 1 / 12) - 1;
    const monthlyCryptoReturn = Math.pow(1 + cryptoReturn / 100, 1 / 12) - 1;
    const monthlyPropertyGrowth = Math.pow(1 + propertyGrowth / 100, 1 / 12) - 1;
    const monthlyInflation = Math.pow(1 + inflationRate / 100, 1 / 12) - 1;

    const data = [];
    const now = new Date();

    let investments = startingValues.investmentsAud;
    let crypto = startingValues.cryptoAud;
    let property = startingValues.homeValue + startingValues.businessValue;
    let cash = startingValues.cashAud;
    let retirement = startingValues.retirementAud;
    let cumulativeInflation = 1;

    for (let month = 0; month <= 60; month++) {
      const date = new Date(now.getFullYear(), now.getMonth() + month, 1);
      
      const nominalNetWorth = investments + crypto + property + cash + retirement;
      const realNetWorth = showInflationAdjusted ? nominalNetWorth / cumulativeInflation : nominalNetWorth;

      data.push({
        month,
        date: date.toISOString(),
        label: date.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
        netWorth: realNetWorth,
        investments: showInflationAdjusted ? investments / cumulativeInflation : investments,
        crypto: showInflationAdjusted ? crypto / cumulativeInflation : crypto,
        property: showInflationAdjusted ? property / cumulativeInflation : property,
        cash: showInflationAdjusted ? cash / cumulativeInflation : cash,
        retirement: showInflationAdjusted ? retirement / cumulativeInflation : retirement,
      });

      // Apply growth + contributions (allocate 70% to investments, 30% to cash)
      investments = investments * (1 + monthlySharesReturn) + monthlyContribution * 0.7;
      crypto = crypto * (1 + monthlyCryptoReturn);
      property = property * (1 + monthlyPropertyGrowth);
      cash = cash + monthlyContribution * 0.3;
      retirement = retirement * (1 + monthlySharesReturn * 0.8); // Retirement grows slightly slower
      cumulativeInflation = cumulativeInflation * (1 + monthlyInflation);
    }

    return data;
  }, [startingValues, monthlyContribution, sharesReturn, cryptoReturn, propertyGrowth, inflationRate, showInflationAdjusted]);

  const year1 = projectionData.find(d => d.month === 12)?.netWorth ?? 0;
  const year3 = projectionData.find(d => d.month === 36)?.netWorth ?? 0;
  const year5 = projectionData.find(d => d.month === 60)?.netWorth ?? 0;
  const current = projectionData[0]?.netWorth ?? 0;

  const chartConfig = {
    netWorth: {
      label: showInflationAdjusted ? 'Net Worth (Real)' : 'Net Worth (Nominal)',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          5-Year Projection {showInflationAdjusted && '(Inflation Adjusted)'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Milestone cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Today</div>
            <div className="font-semibold">{formatCompactCurrency(current)}</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">1 Year</div>
            <div className="font-semibold">{formatCompactCurrency(year1)}</div>
            <div className="text-xs text-success">+{formatCompactCurrency(year1 - current)}</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">3 Years</div>
            <div className="font-semibold">{formatCompactCurrency(year3)}</div>
            <div className="text-xs text-success">+{formatCompactCurrency(year3 - current)}</div>
          </div>
          <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="text-xs text-muted-foreground">5 Years</div>
            <div className="font-semibold text-primary">{formatCompactCurrency(year5)}</div>
            <div className="text-xs text-success">+{formatCompactCurrency(year5 - current)}</div>
          </div>
        </div>

        {/* Chart */}
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="projectionGradientMain" x1="0" y1="0" x2="0" y2="1">
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
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#projectionGradientMain)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Shares: {sharesReturn}% • Crypto: {cryptoReturn}% • Property: {propertyGrowth}% • Inflation: {inflationRate}% • Monthly contribution: {formatCompactCurrency(monthlyContribution)}
        </p>
      </CardContent>
    </Card>
  );
}
