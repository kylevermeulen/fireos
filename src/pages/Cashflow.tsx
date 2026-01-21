import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { useCashflowData, useFilteredCashflow } from '@/hooks/useCashflowData';
import { SankeyDiagram } from '@/components/cashflow/SankeyDiagram';
import { CashflowTable } from '@/components/cashflow/CashflowTable';
import { CashflowSummary } from '@/components/cashflow/CashflowSummary';
import { CashflowTimeRange } from '@/components/cashflow/CashflowTimeRange';
import { CashflowFilters } from '@/components/cashflow/CashflowFilters';
import { CashflowEmptyState } from '@/components/cashflow/CashflowEmptyState';
import { CashflowTimeRange as TimeRangeType, CategoryTotal } from '@/types/cashflow';

export default function Cashflow() {
  const { rawTransactions, isLoading, error, reload } = useCashflowData();
  
  // Filter state
  const [timeRange, setTimeRange] = useState<TimeRangeType>('6M');
  const [excludeInternalTransfers, setExcludeInternalTransfers] = useState(true);
  const [showUnknown, setShowUnknown] = useState(true);
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);
  
  const {
    totalIncome,
    totalSpending,
    netPosition,
    incomeByCategory,
    spendingByCategory,
    spendingByL1,
    spending,
  } = useFilteredCashflow(rawTransactions, timeRange, excludeInternalTransfers, showUnknown);

  // Get L2 spending for drilldown
  const spendingByL2ForDrilldown = useMemo((): CategoryTotal[] => {
    if (!drilldownCategory) return [];
    
    const filtered = spending.filter(tx => tx.L1 === drilldownCategory);
    const map = new Map<string, { total: number; count: number }>();
    
    filtered.forEach(tx => {
      const key = tx.L2;
      const existing = map.get(key) || { total: 0, count: 0 };
      map.set(key, {
        total: existing.total + tx.amount_aud,
        count: existing.count + 1,
      });
    });
    
    const l1Total = filtered.reduce((sum, tx) => sum + tx.amount_aud, 0);
    
    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        L1: drilldownCategory,
        L2: category,
        total: data.total,
        count: data.count,
        percentage: l1Total > 0 ? data.total / l1Total : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [spending, drilldownCategory]);

  const handleDrillDown = (l1Category: string) => {
    setDrilldownCategory(l1Category);
  };

  const handleBack = () => {
    setDrilldownCategory(null);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cash Flow</h1>
            <p className="text-muted-foreground">Income vs spending analysis</p>
          </div>
          <div className="grid gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-[400px]" />
            <div className="grid md:grid-cols-2 gap-4">
              <Skeleton className="h-[300px]" />
              <Skeleton className="h-[300px]" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || rawTransactions.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cash Flow</h1>
            <p className="text-muted-foreground">Income vs spending analysis</p>
          </div>
          <CashflowEmptyState onUpload={reload} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cash Flow</h1>
            <p className="text-muted-foreground">
              {rawTransactions.length.toLocaleString()} transactions loaded
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <CashflowTimeRange value={timeRange} onChange={setTimeRange} />
          <div className="flex-1" />
          <CashflowFilters
            excludeInternalTransfers={excludeInternalTransfers}
            onExcludeInternalTransfersChange={setExcludeInternalTransfers}
            showUnknown={showUnknown}
            onShowUnknownChange={setShowUnknown}
          />
        </div>

        {/* Summary */}
        <CashflowSummary
          totalIncome={totalIncome}
          totalSpending={totalSpending}
          netPosition={netPosition}
        />

        {/* Sankey Diagram */}
        <SankeyDiagram
          incomeByCategory={incomeByCategory}
          spendingByL1={spendingByL1}
          spendingByL2={spendingByL2ForDrilldown}
          totalIncome={totalIncome}
          totalSpending={totalSpending}
          onDrillDown={handleDrillDown}
          drilldownCategory={drilldownCategory}
          onBack={handleBack}
        />

        {/* Tables */}
        <div className="grid md:grid-cols-2 gap-4">
          <CashflowTable
            title="Income by Category"
            data={incomeByCategory}
            total={totalIncome}
            type="income"
          />
          <CashflowTable
            title={drilldownCategory ? `${drilldownCategory} Breakdown` : "Spending by Category"}
            data={drilldownCategory ? spendingByL2ForDrilldown : spendingByCategory}
            total={drilldownCategory 
              ? spendingByL2ForDrilldown.reduce((sum, item) => sum + item.total, 0)
              : totalSpending
            }
            type="spending"
          />
        </div>
      </div>
    </AppLayout>
  );
}
