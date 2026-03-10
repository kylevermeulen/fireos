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
  const [mode, setMode] = useState<CashflowMode>('accrual');
  const { effectiveDateRange } = useGlobalTimeRange();
  const { rawTransactions, isLoading, error, reload, updateTransaction } = useCashflowData(mode);
  
  const [l1Filter, setL1Filter] = useState<string | null>(null);
  const [l2Filter, setL2Filter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ type: string; value: string } | null>(null);
  const [selectedTableCategory, setSelectedTableCategory] = useState<string | null>(null);
  
  const {
    totalIncome, totalSpending, netPosition,
    incomeByCategory, spendingByCategory, spendingByL1,
    spending, allL1Categories, allL2Categories, sanityStats,
  } = useFilteredCashflow(rawTransactions, effectiveDateRange, l1Filter, l2Filter, searchQuery);

  // Get all external transactions (income + spending) for drilldown
  const allExternalTransactions = useMemo(() => {
    return rawTransactions.filter(tx => {
      if (tx.date < effectiveDateRange.from || tx.date > effectiveDateRange.to) return false;
      if (tx.is_internal_transfer || tx.L1 === 'Transfer — Internal') return false;
      if (l1Filter && tx.L1 !== l1Filter) return false;
      if (l2Filter && tx.L2 !== l2Filter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!tx.counterparty.toLowerCase().includes(q) && !tx.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rawTransactions, effectiveDateRange, l1Filter, l2Filter, searchQuery]);

  const spendingByL2ForDrilldown = useMemo((): CategoryTotal[] => {
    if (!drilldownCategory) return [];
    const filtered = spending.filter(tx => tx.L1 === drilldownCategory);
    const map = new Map<string, { total: number; count: number }>();
    filtered.forEach(tx => {
      const existing = map.get(tx.L2) || { total: 0, count: 0 };
      map.set(tx.L2, { total: existing.total + tx.amount_aud, count: existing.count + 1 });
    });
    const l1Total = filtered.reduce((sum, tx) => sum + tx.amount_aud, 0);
    return Array.from(map.entries())
      .map(([category, data]) => ({
        category, L1: drilldownCategory, L2: category,
        total: data.total, count: data.count,
        percentage: l1Total > 0 ? data.total / l1Total : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [spending, drilldownCategory]);

  // Filtered transactions for bottom table
  const drilldownTransactions = useMemo(() => {
    let txs = allExternalTransactions;

    // Sankey/node filter
    if (selectedNode) {
      txs = txs.filter(tx => {
        switch (selectedNode.type) {
          case 'source_account': return tx.source_account === selectedNode.value;
          case 'L1': return tx.L1 === selectedNode.value;
          case 'L2': return tx.L2 === selectedNode.value;
          case 'counterparty': return tx.counterparty === selectedNode.value;
          case 'income': return tx.L1 === 'Income' || tx.direction === 'in';
          default: return true;
        }
      });
    }

    // Table category click filter
    if (selectedTableCategory) {
      txs = txs.filter(tx => tx.L1 === selectedTableCategory || tx.L2 === selectedTableCategory);
    }

    return txs.sort((a, b) => b.amount_aud - a.amount_aud);
  }, [allExternalTransactions, selectedNode, selectedTableCategory]);

  // Build title for drilldown table
  const drilldownTitle = useMemo(() => {
    if (selectedTableCategory) return `${selectedTableCategory} Transactions`;
    if (selectedNode) return `Transactions: ${selectedNode.value}`;
    return 'All External Transactions';
  }, [selectedNode, selectedTableCategory]);

  const handleTableCategoryClick = (category: string) => {
    setSelectedTableCategory(prev => prev === category ? null : category);
    // Clear sankey selection when clicking table
    if (!selectedNode || selectedNode.value !== category) {
      setSelectedNode(null);
    }
  };

  const handleDrillDown = (l1Category: string) => {
    setDrilldownCategory(l1Category);
    setSelectedNode({ type: 'L1', value: l1Category });
    setSelectedTableCategory(null);
  };

  const handleBack = () => {
    setDrilldownCategory(null);
    setSelectedNode(null);
    setSelectedTableCategory(null);
  };

  const handleNodeClick = (type: string, value: string) => {
    setSelectedNode({ type, value });
    setSelectedTableCategory(null);
    if (type === 'L1') setDrilldownCategory(value);
  };

  const handleClearFilters = () => {
    setL1Filter(null);
    setL2Filter(null);
    setSearchQuery('');
    setSelectedNode(null);
    setDrilldownCategory(null);
    setSelectedTableCategory(null);
  };

  if (isLoading && rawTransactions.length === 0) {
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cash Flow</h1>
            <p className="text-muted-foreground">
              {rawTransactions.length.toLocaleString()} transactions • {format(effectiveDateRange.from, 'MMM d, yyyy')} – {format(effectiveDateRange.to, 'MMM d, yyyy')}
            </p>
          </div>
          <CashflowModeToggle mode={mode} onChange={setMode} />
        </div>

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

        <CashflowCategoryFilters
          l1Categories={allL1Categories}
          l2Categories={allL2Categories}
          l1Filter={l1Filter}
          l2Filter={l2Filter}
          onL1Change={setL1Filter}
          onL2Change={setL2Filter}
          onClear={handleClearFilters}
        />

        <CashflowSummary totalIncome={totalIncome} totalSpending={totalSpending} netPosition={netPosition} />

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

        <div className="grid md:grid-cols-2 gap-4">
          <CashflowTable
            title="Income by Category"
            data={incomeByCategory}
            total={totalIncome}
            type="income"
            selectedCategory={selectedTableCategory}
            onCategoryClick={handleTableCategoryClick}
          />
          <CashflowTable
            title={drilldownCategory ? `${drilldownCategory} Breakdown` : "Spending by Category"}
            data={drilldownCategory ? spendingByL2ForDrilldown : spendingByCategory}
            total={drilldownCategory 
              ? spendingByL2ForDrilldown.reduce((sum, item) => sum + item.total, 0)
              : totalSpending
            }
            type="spending"
            selectedCategory={selectedTableCategory}
            onCategoryClick={handleTableCategoryClick}
          />
        </div>

        <TransactionsTable
          transactions={drilldownTransactions}
          title={drilldownTitle}
          onClearFilter={() => { setSelectedNode(null); setSelectedTableCategory(null); }}
          showClearFilter={!!selectedNode || !!selectedTableCategory}
          onTransactionUpdated={reload}
          onOptimisticUpdate={updateTransaction}
        />

        <DataSanityPanel stats={sanityStats} mode={mode} />
      </div>
    </AppLayout>
  );
}
