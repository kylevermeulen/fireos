import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { formatCompactCurrency, formatDate } from '@/lib/format';

interface MonthlyChangeChartProps {
  data: Array<{
    date: string;
    Cash: number;
    Investments: number;
    Retirement: number;
    Property: number;
    Business: number;
    Liabilities: number;
  }>;
}

// Unified asset class colors (no Crypto/Offset)
const ASSET_CLASS_COLORS: Record<string, string> = {
  Cash: 'hsl(var(--chart-1))',
  Investments: 'hsl(var(--chart-2))',
  Retirement: 'hsl(var(--chart-3))',
  Property: 'hsl(var(--chart-5))',
  Business: 'hsl(var(--primary))',
  Liabilities: 'hsl(var(--destructive))',
};

const ASSET_CLASSES = ['Cash', 'Investments', 'Retirement', 'Property', 'Business', 'Liabilities'] as const;

export function MonthlyChangeChart({ data }: MonthlyChangeChartProps) {
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      date: formatDate(d.date, 'short'),
      rawDate: d.date,
      // Invert liabilities for net calculation
      netTotal: d.Cash + d.Investments + d.Retirement + d.Property + d.Business - d.Liabilities,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No monthly delta data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    const dataItem = payload[0]?.payload;
    if (!dataItem) return null;

    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-2">{formatDate(dataItem.rawDate, 'medium')}</p>
        <div className="space-y-1">
          {ASSET_CLASSES.filter(c => c !== 'Liabilities').map((assetClass) => {
            const value = dataItem[assetClass];
            if (value === 0) return null;
            return (
              <div key={assetClass} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: ASSET_CLASS_COLORS[assetClass] }}
                  />
                  <span className="text-muted-foreground">{assetClass}</span>
                </div>
                <span className={`font-medium tabular-nums ${value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {value >= 0 ? '+' : ''}{formatCompactCurrency(value, 'AUD')}
                </span>
              </div>
            );
          })}
          {dataItem.Liabilities !== 0 && (
            <div className="flex items-center justify-between gap-4 border-t pt-1 mt-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ASSET_CLASS_COLORS.Liabilities }}
                />
                <span className="text-muted-foreground">Liabilities Δ</span>
              </div>
              <span className={`font-medium tabular-nums ${dataItem.Liabilities < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dataItem.Liabilities >= 0 ? '+' : ''}{formatCompactCurrency(dataItem.Liabilities, 'AUD')}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 border-t pt-1 mt-1 font-medium">
            <span>Net Change</span>
            <span className={`tabular-nums ${dataItem.netTotal > 0 ? 'text-green-600' : dataItem.netTotal < 0 ? 'text-red-600' : ''}`}>
              {dataItem.netTotal >= 0 ? '+' : ''}{formatCompactCurrency(dataItem.netTotal, 'AUD')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCompactCurrency(value, 'AUD')}
            className="text-muted-foreground"
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px' }}
            iconSize={8}
          />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
          {ASSET_CLASSES.filter(c => c !== 'Liabilities').map((assetClass) => (
            <Bar
              key={assetClass}
              dataKey={assetClass}
              stackId="a"
              fill={ASSET_CLASS_COLORS[assetClass]}
              radius={[0, 0, 0, 0]}
            />
          ))}
          <Bar
            dataKey={(d: any) => -d.Liabilities}
            name="Liabilities (inverted)"
            stackId="a"
            fill={ASSET_CLASS_COLORS.Liabilities}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
