import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/format';

interface DataPoint {
  date: string;
  netWorth: number;
  liquid: number;
  illiquid: number;
}

interface NetWorthChartProps {
  data: DataPoint[];
  title?: string;
}

// Compute adaptive tick interval based on data span
function getTickInterval(dataLength: number): number {
  if (dataLength <= 12) return 0; // Show every tick for ≤1Y
  if (dataLength <= 36) return 2; // Quarterly for ≤3Y
  return Math.max(Math.floor(dataLength / 12) - 1, 3); // ~Yearly for longer spans
}

export function NetWorthChart({ data, title = 'Net Worth Trend' }: NetWorthChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      dateLabel: formatDate(d.date, 'short'),
    }));
  }, [data]);

  const tickInterval = useMemo(() => getTickInterval(chartData.length), [chartData.length]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="liquidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                interval={tickInterval}
                className="text-muted-foreground"
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v, 'AUD', { compact: true })}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-card p-3 shadow-lg">
                      <p className="font-medium mb-2">{label}</p>
                      {payload.map((p, i) => (
                        <p key={i} className="text-sm" style={{ color: p.color }}>
                          {p.name}: {formatCurrency(p.value as number, 'AUD')}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                name="Net Worth"
                stroke="hsl(var(--primary))"
                fill="url(#netWorthGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="liquid"
                name="Liquid"
                stroke="hsl(var(--success))"
                fill="url(#liquidGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
