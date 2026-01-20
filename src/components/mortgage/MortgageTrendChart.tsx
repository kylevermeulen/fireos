import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/format';

interface MortgageSnapshot {
  monthKey: string;
  totalLoan: number;
  offsetBalance: number;
  netMortgage: number;
}

interface MortgageTrendChartProps {
  data: MortgageSnapshot[];
}

export function MortgageTrendChart({ data }: MortgageTrendChartProps) {
  const chartData = useMemo(() => {
    return data.map(d => ({
      month: new Date(d.monthKey).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
      'Total Loan': d.totalLoan,
      'Offset': d.offsetBalance,
      'Net Mortgage': d.netMortgage,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Loan vs Offset vs Net</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="totalLoanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="offsetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => formatCompactCurrency(v)}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => formatCompactCurrency(value)}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                iconType="line"
              />
              <Area
                type="monotone"
                dataKey="Total Loan"
                stroke="hsl(var(--muted-foreground))"
                fill="url(#totalLoanGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Offset"
                stroke="hsl(var(--primary))"
                fill="url(#offsetGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Net Mortgage"
                stroke="hsl(var(--foreground))"
                fill="url(#netGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
