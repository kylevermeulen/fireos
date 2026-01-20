import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/format';

interface DataPoint {
  name: string;
  value: number;
  color: string;
}

interface AllocationChartProps {
  data: DataPoint[];
  title?: string;
  total?: number;
}

const RADIAN = Math.PI / 180;

export function AllocationChart({ data, title = 'Asset Allocation', total }: AllocationChartProps) {
  const chartData = useMemo(() => {
    return data.filter((d) => d.value > 0);
  }, [data]);

  const calculatedTotal = total ?? chartData.reduce((sum, d) => sum + d.value, 0);

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {formatPercent(percent, 0)}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                innerRadius={50}
                dataKey="value"
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload as DataPoint;
                  const percent = data.value / calculatedTotal;
                  return (
                    <div className="rounded-lg border bg-card p-3 shadow-lg">
                      <p className="font-medium" style={{ color: data.color }}>
                        {data.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(data.value, 'AUD')} ({formatPercent(percent)})
                      </p>
                    </div>
                  );
                }}
              />
              <Legend
                formatter={(value) => <span className="text-sm">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
