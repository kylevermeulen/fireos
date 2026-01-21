import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { useCashflowData, useFilteredCashflow } from '@/hooks/useCashflowData';
import { SankeyDiagram } from '@/components/cashflow/SankeyDiagram';
import { CashflowTable } from '@/components/cashflow/CashflowTable';
import { CashflowSummary } from '@/components/cashflow/CashflowSummary';
import { CashflowEmptyState } from '@/components/cashflow/CashflowEmptyState';
import { TransactionsTable } from '@/components/cashflow/TransactionsTable';
import { DataSanityPanel } from '@/components/cashflow/DataSanityPanel';
import { CashflowModeToggle } from '@/components/cashflow/CashflowModeToggle';
import { GlobalTimeRangeSelector } from '@/components/dashboard/GlobalTimeRangeSelector';
import { CashflowCategoryFilters } from '@/components/cashflow/CashflowCategoryFilters';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { CashflowMode, CategoryTotal } from '@/types/cashflow';
import { useGlobalTimeRange } from '@/contexts/TimeRangeContext';

export default function Cashflow() {
  // Mode state
  const [mode, setMode] = useState<CashflowMode>('amortised');
  
  // Use global time range
  const { effectiveDateRange } = useGlobalTimeRange();
  
  // Data loading
  const { rawTransactions, isLoading, error, reload } = useCashflowData(mode);
  
  // Filter state
  const [l1Filter, setL1Filter] = useState<string | null>(null);
  const [l2Filter, setL2Filter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ type: string; value: string } | null>(null);
  
  const {
    totalIncome,
    totalSpending,
    netPosition,
    incomeByCategory,
    spendingByCategory,
    spendingByL1,
    spending,
    allL1Categories,
    allL2Categories,
    sanityStats,
  } = useFilteredCashflow(rawTransactions, effectiveDateRange, l1Filter, l2Filter, searchQuery);

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

  // Filtered transactions for drilldown table
  const drilldownTransactions = useMemo(() => {
    if (!selectedNode) return spending;
    
    return spending.filter(tx => {
      switch (selectedNode.type) {
        case 'source_account':
          return tx.source_account === selectedNode.value;
        case 'L1':
          return tx.L1 === selectedNode.value;
        case 'L2':
          return tx.L2 === selectedNode.value;
        case 'counterparty':
          return tx.counterparty === selectedNode.value;
        default:
          return true;
      }
    }).sort((a, b) => b.amount_aud - a.amount_aud);
  }, [spending, selectedNode]);

  const handleDrillDown = (l1Category: string) => {
    setDrilldownCategory(l1Category);
    setSelectedNode({ type: 'L1', value: l1Category });
  };

  const handleBack = () => {
    setDrilldownCategory(null);
    setSelectedNode(null);
  };

  const handleNodeClick = (type: string, value: string) => {
    setSelectedNode({ type, value });
    if (type === 'L1') {
      setDrilldownCategory(value);
    }
  };

  const handleClearFilters = () => {
    setL1Filter(null);
    setL2Filter(null);
    setSearchQuery('');
    setSelectedNode(null);
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
              {rawTransactions.length.toLocaleString()} transactions • {format(effectiveDateRange.from, 'MMM d, yyyy')} – {format(effectiveDateRange.to, 'MMM d, yyyy')}
            </p>
          </div>
          <CashflowModeToggle mode={mode} onChange={setMode} />
        </div>

        {/* Controls Row 1: Time selector and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <GlobalTimeRangeSelector />
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search counterparty or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Controls Row 2: Category filters */}
        <CashflowCategoryFilters
          l1Categories={allL1Categories}
          l2Categories={allL2Categories}
          l1Filter={l1Filter}
          l2Filter={l2Filter}
          onL1Change={setL1Filter}
          onL2Change={setL2Filter}
          onClear={handleClearFilters}
        />

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
          onNodeClick={handleNodeClick}
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

        {/* Transactions Drilldown Table */}
        <TransactionsTable
          transactions={drilldownTransactions}
          title={selectedNode ? `Transactions: ${selectedNode.value}` : 'All External Transactions'}
          onClearFilter={() => setSelectedNode(null)}
          showClearFilter={!!selectedNode}
        />

        {/* Data Sanity Panel */}
        <DataSanityPanel stats={sanityStats} mode={mode} />
      </div>
    </AppLayout>
  );
}
