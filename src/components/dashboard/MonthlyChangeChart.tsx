import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, ReferenceLine } from 'recharts';
import { formatCurrency, formatDate } from '@/lib/format';

interface MonthlyChangeChartProps {
  data: Array<{
    date: string;
    Cash: number;
    Offset: number;
    Investments: number;
    Crypto: number;
    Retirement: number;
    Home: number;
    Business: number;
    Liabilities: number;
  }>;
}

const chartConfig = {
  Cash: { label: 'Cash', color: 'hsl(var(--chart-1))' },
  Offset: { label: 'Offset', color: 'hsl(var(--chart-1))' },
  Investments: { label: 'Investments', color: 'hsl(var(--chart-2))' },
  Crypto: { label: 'Crypto', color: 'hsl(var(--chart-4))' },
  Retirement: { label: 'Retirement', color: 'hsl(var(--chart-3))' },
  Home: { label: 'Home', color: 'hsl(var(--chart-5))' },
  Business: { label: 'Business', color: 'hsl(var(--primary))' },
  Liabilities: { label: 'Liabilities', color: 'hsl(var(--destructive))' },
};

// Custom stacked data that handles positive and negative separately
function prepareStackedData(data: MonthlyChangeChartProps['data']) {
  return data.map(item => {
    // For net wealth calculation, liabilities decrease when they go negative
    const netLiabilities = -item.Liabilities; // Invert for net calculation
    const total = item.Cash + item.Offset + item.Investments + item.Crypto + 
                  item.Retirement + item.Home + item.Business + netLiabilities;
    
    return {
      ...item,
      date: item.date,
      formattedDate: formatDate(item.date, 'short'),
      // For stacked visualization, we'll show each category separately
      netTotal: total,
    };
  });
}

export function MonthlyChangeChart({ data }: MonthlyChangeChartProps) {
  const chartData = useMemo(() => prepareStackedData(data), [data]);
  
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          No monthly data available for selected range
        </CardContent>
      </Card>
    );
  }

  const categories = ['Cash', 'Offset', 'Investments', 'Crypto', 'Retirement', 'Home', 'Business'] as const;

  return (
    <ChartContainer config={chartConfig} className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
          <XAxis 
            dataKey="formattedDate" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tickFormatter={(value) => formatCurrency(value, 'AUD', { compact: true })}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <ChartTooltip 
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              
              const dataItem = payload[0]?.payload;
              if (!dataItem) return null;

              return (
                <div className="rounded-lg border bg-background p-3 shadow-lg">
                  <div className="font-medium mb-2">{formatDate(dataItem.date, 'medium')}</div>
                  <div className="space-y-1 text-sm">
                    {categories.map(cat => {
                      const value = dataItem[cat];
                      if (value === 0) return null;
                      return (
                        <div key={cat} className="flex justify-between gap-4">
                          <span style={{ color: chartConfig[cat].color }}>{cat}:</span>
                          <span className={value > 0 ? 'text-green-600' : 'text-red-600'}>
                            {value > 0 ? '+' : ''}{formatCurrency(value, 'AUD', { compact: true })}
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between gap-4 border-t pt-1 mt-1">
                      <span className="text-muted-foreground">Liabilities Δ:</span>
                      <span className={dataItem.Liabilities < 0 ? 'text-green-600' : dataItem.Liabilities > 0 ? 'text-red-600' : ''}>
                        {dataItem.Liabilities > 0 ? '+' : ''}{formatCurrency(dataItem.Liabilities, 'AUD', { compact: true })}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-t pt-1 mt-1 font-medium">
                      <span>Net Change:</span>
                      <span className={dataItem.netTotal > 0 ? 'text-green-600' : dataItem.netTotal < 0 ? 'text-red-600' : ''}>
                        {dataItem.netTotal > 0 ? '+' : ''}{formatCurrency(dataItem.netTotal, 'AUD', { compact: true })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          {categories.map((cat) => (
            <Bar 
              key={cat}
              dataKey={cat} 
              stackId="positive"
              fill={chartConfig[cat].color}
              radius={[0, 0, 0, 0]}
            />
          ))}
          <Bar 
            dataKey={(d: any) => -d.Liabilities} 
            name="Liabilities (inverted)"
            stackId="positive"
            fill={chartConfig.Liabilities.color}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
