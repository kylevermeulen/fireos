import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { GlobalTimeRangeSelector } from '@/components/dashboard/GlobalTimeRangeSelector';
import { useGlobalTimeRange } from '@/contexts/TimeRangeContext';
import { useCashflowData, useFilteredCashflow } from '@/hooks/useCashflowData';
import { useFireCalculations, FireSettings } from '@/hooks/useFireCalculations';
import { CashflowMode } from '@/types/cashflow';

import { FireKpiStrip } from '@/components/fire/FireKpiStrip';
import { FireProgressCard } from '@/components/fire/FireProgressCard';
import { FireSettingsCard } from '@/components/fire/FireSettingsCard';
import { FireScenarioTable } from '@/components/fire/FireScenarioTable';
import { FireProjectionChart } from '@/components/fire/FireProjectionChart';
import { FireSpendingBreakdown } from '@/components/fire/FireSpendingBreakdown';
import { FireCashflowSummary } from '@/components/fire/FireCashflowSummary';
import { SankeyDiagram } from '@/components/cashflow/SankeyDiagram';
import { CashflowTable } from '@/components/cashflow/CashflowTable';
import { DataSanityPanel } from '@/components/cashflow/DataSanityPanel';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';

const DEFAULT_SETTINGS: FireSettings = {
  swrPercent: 4,
  realReturnPercent: 5,
  targetAnnualSpend: null,
  includeRetirement: false,
  includeCrypto: true,
  includeOffset: false,
};

export default function Fire() {
  const { effectiveDateRange } = useGlobalTimeRange();
  const [mode, setMode] = useState<CashflowMode>('accrual');
  const [settings, setSettings] = useState<FireSettings>(DEFAULT_SETTINGS);

  // Load transaction data
  const { rawTransactions, isLoading: txLoading, error } = useCashflowData(mode);
  
  // Filter transactions
  const {
    income,
    spending,
    totalIncome,
    totalSpending,
    incomeByCategory,
    spendingByL1,
    sanityStats,
  } = useFilteredCashflow(rawTransactions, effectiveDateRange);

  // FIRE calculations
  const { metrics, isLoading: fireLoading } = useFireCalculations(
    rawTransactions,
    effectiveDateRange,
    settings
  );

  // Calculate months in range for averages
  const monthsInRange = useMemo(() => {
    const msInRange = effectiveDateRange.to.getTime() - effectiveDateRange.from.getTime();
    return Math.max(1, msInRange / (1000 * 60 * 60 * 24 * 30.44));
  }, [effectiveDateRange]);

  const isLoading = txLoading || fireLoading;

  if (isLoading && !metrics && rawTransactions.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </AppLayout>
    );
  }

  if (error || !metrics) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              FIRE Calculator
            </h1>
            <p className="text-muted-foreground">Financial Independence, Retire Early</p>
          </div>
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                {error || 'Unable to load FIRE data. Please ensure you have wealth snapshot data.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              FIRE Calculator
            </h1>
            <p className="text-muted-foreground">Financial Independence, Retire Early</p>
          </div>
          
          <div className="flex items-center gap-4">
            <ToggleGroup 
              type="single" 
              value={mode} 
              onValueChange={(v) => v && setMode(v as CashflowMode)}
              className="border rounded-lg"
            >
              <ToggleGroupItem value="amortised" className="text-xs px-3">
                Amortised
              </ToggleGroupItem>
              <ToggleGroupItem value="cashflow" className="text-xs px-3">
                Cashflow
              </ToggleGroupItem>
            </ToggleGroup>
            <GlobalTimeRangeSelector />
          </div>
        </div>

        {/* KPI Strip */}
        <FireKpiStrip metrics={metrics} />

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FI Progress - spans 2 columns */}
          <FireProgressCard metrics={metrics} />
          
          {/* Settings panel */}
          <FireSettingsCard 
            settings={settings} 
            onChange={setSettings}
            defaultAnnualSpend={metrics.annualizedSpend}
          />
        </div>

        {/* Projection Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FireProjectionChart
            investableAssets={metrics.investableAssets}
            fiNumber={metrics.fiNumber}
            monthlyContribution={metrics.netSurplus / monthsInRange}
            realReturnPercent={settings.realReturnPercent}
          />
          
          {/* Scenario Analysis */}
          <FireScenarioTable
            investableAssets={metrics.investableAssets}
            annualizedSpend={metrics.annualizedSpend}
            monthlySurplus={metrics.netSurplus / monthsInRange}
          />
        </div>

        {/* Spending Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FireCashflowSummary metrics={metrics} monthsInRange={monthsInRange} />
          <FireSpendingBreakdown metrics={metrics} />
          
          {/* Top spending categories */}
          <CashflowTable 
            data={spendingByL1.slice(0, 8)} 
            title="Top Spending Categories"
            total={totalSpending}
            type="spending"
          />
        </div>

        {/* Sankey Diagram */}
        <Card>
          <CardHeader>
            <CardTitle>Income → Spending Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <SankeyDiagram
              incomeByCategory={incomeByCategory}
              spendingByL1={spendingByL1}
              totalIncome={totalIncome}
              totalSpending={totalSpending}
            />
          </CardContent>
        </Card>

        {/* Data sanity panel */}
        <DataSanityPanel stats={sanityStats} mode={mode} />
      </div>
    </AppLayout>
  );
}
