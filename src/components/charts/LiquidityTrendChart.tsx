import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatPercent } from '@/lib/format';

interface DataPoint {
  date: string;
  liquid: number;
  illiquid: number;
  liquidityPercent: number;
}

interface LiquidityTrendChartProps {
  data: DataPoint[];
  title?: string;
}

export function LiquidityTrendChart({ data, title = 'Liquidity Trend' }: LiquidityTrendChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      dateLabel: formatDate(d.date, 'short'),
    }));
  }, [data]);

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
                <linearGradient id="liquidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="illiquidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
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
                  const point = payload[0]?.payload as DataPoint & { dateLabel: string };
                  return (
                    <div className="rounded-lg border bg-card p-3 shadow-lg">
                      <p className="font-medium mb-2">{label}</p>
                      <p className="text-sm text-green-600">
                        Liquid: {formatCurrency(point.liquid, 'AUD')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Illiquid: {formatCurrency(point.illiquid, 'AUD')}
                      </p>
                      <p className="text-sm font-medium mt-1">
                        Liquidity: {formatPercent(point.liquidityPercent)}
                      </p>
                    </div>
                  );
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="illiquid"
                name="Illiquid"
                stroke="hsl(var(--muted-foreground))"
                fill="url(#illiquidGradient)"
                strokeWidth={2}
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="liquid"
                name="Liquid"
                stroke="hsl(var(--success))"
                fill="url(#liquidGradient)"
                strokeWidth={2}
                stackId="1"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
