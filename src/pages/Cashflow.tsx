import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { CashflowChart } from '@/components/charts/CashflowChart';
import { formatCurrency, formatPercent } from '@/lib/format';
import { ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react';

const cashflowData = [
  { date: '2024-09-01', income: 52748, spend: 17797, net: 34951 },
  { date: '2024-10-01', income: 26195, spend: 15000, net: 11195 },
  { date: '2024-11-01', income: 15099, spend: 12000, net: 3099 },
  { date: '2024-12-01', income: 45000, spend: 20000, net: 25000 },
  { date: '2025-01-01', income: 55000, spend: 18000, net: 37000 },
];

export default function Cashflow() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cashflow</h1>
          <p className="text-muted-foreground">Income vs spending analysis</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="This Month Income"
            value={formatCurrency(55000, 'AUD', { compact: true })}
            icon={<ArrowDownLeft className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            title="This Month Spend"
            value={formatCurrency(18000, 'AUD', { compact: true })}
            icon={<ArrowUpRight className="h-5 w-5" />}
          />
          <StatCard
            title="Net Savings"
            value={formatCurrency(37000, 'AUD', { compact: true })}
            change={{ value: '+48%', isPositive: true }}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            title="Savings Rate"
            value={formatPercent(0.67)}
            subtitle="Rolling 12-month: 58%"
          />
        </div>

        <CashflowChart data={cashflowData} title="Monthly Income vs Spending" />
      </div>
    </AppLayout>
  );
}
