import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/format';

interface MortgageSnapshot {
  monthKey: string;
  monthlyInterest: number;
}

interface InterestTrendChartProps {
  data: MortgageSnapshot[];
}

export function InterestTrendChart({ data }: InterestTrendChartProps) {
  const chartData = useMemo(() => {
    return data.map(d => ({
      month: new Date(d.monthKey).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
      'Interest/mo': d.monthlyInterest,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Est. Interest / Month</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              <Line
                type="monotone"
                dataKey="Interest/mo"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
