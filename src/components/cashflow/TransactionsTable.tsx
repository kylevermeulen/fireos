import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ArrowUp, ArrowDown, ArrowUpDown, Download, CalendarDays } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCompactCurrency } from '@/lib/format';
import { CashflowTransaction } from '@/types/cashflow';
import { CategoryBadge } from '@/components/transactions/CategoryBadge';
import { TransactionDetailModal } from '@/components/transactions/TransactionDetailModal';
import { buildTransferLinks } from '@/components/transactions/TransferLinkBadge';
import { cn } from '@/lib/utils';

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportTransactionsCsv(transactions: CashflowTransaction[], filename: string) {
  const headers = ['Date', 'Source Account', 'Counterparty', 'Description', 'Amount (Native)', 'Currency', 'Amount (AUD)', 'Direction', 'Internal Transfer', 'L1', 'L2'];
  const rows = transactions.map(tx => [
    format(tx.date, 'yyyy-MM-dd'),
    escapeCsvField(tx.source_account),
    escapeCsvField(tx.counterparty),
    escapeCsvField(tx.description),
    tx.amount_native.toString(),
    tx.currency,
    tx.amount_aud.toString(),
    tx.direction,
    tx.is_internal_transfer ? 'true' : 'false',
    escapeCsvField(tx.L1),
    escapeCsvField(tx.L2),
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface TransactionsTableProps {
  transactions: CashflowTransaction[];
  title: string;
  onClearFilter?: () => void;
  showClearFilter?: boolean;
  onTransactionUpdated?: () => void;
  onOptimisticUpdate?: (transactionId: string, newL1: string, isTransfer: boolean) => void;
}

type SortField = 'date' | 'source_account' | 'amount_aud' | 'L1';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection;
}

const PAGE_SIZE = 250;

export function TransactionsTable({
  transactions,
  title,
  onClearFilter,
  showClearFilter = false,
  onTransactionUpdated,
  onOptimisticUpdate,
}: TransactionsTableProps) {
  const [sortState, setSortState] = useState<SortState>({ field: 'amount_aud', direction: 'desc' });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedTx, setSelectedTx] = useState<CashflowTransaction | null>(null);

  const transferLinks = useMemo(() => buildTransferLinks(
    transactions.map(tx => ({
      id: tx.id,
      transaction_date: format(tx.date, 'yyyy-MM-dd'),
      amount_aud: tx.direction === 'out' ? -tx.amount_aud : tx.amount_aud,
      source_account_name: tx.source_account,
      is_internal_transfer: tx.is_internal_transfer,
      counterparty: tx.counterparty,
      description: tx.description,
    }))
  ), [transactions]);

  const handleSort = (field: SortField) => {
    setSortState(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const sortedTransactions = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      const { field, direction } = sortState;
      const multiplier = direction === 'asc' ? 1 : -1;

      switch (field) {
        case 'date':
          return multiplier * (a.date.getTime() - b.date.getTime());
        case 'source_account':
          return multiplier * (a.source_account || '').localeCompare(b.source_account || '');
        case 'amount_aud':
          return multiplier * (a.amount_aud - b.amount_aud);
        case 'L1':
          return multiplier * (a.L1 || '').localeCompare(b.L1 || '');
        default:
          return 0;
      }
    });
    return sorted;
  }, [transactions, sortState]);

  const visibleTransactions = sortedTransactions.slice(0, visibleCount);
  const hasMore = visibleCount < transactions.length;

  const handleShowMore = () => {
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, transactions.length));
  };

  const handleBulkUpdate = (ids: string[], newL1: string, isTransfer: boolean) => {
    ids.forEach(id => onOptimisticUpdate?.(id, newL1, isTransfer));
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortState.field === field;
    return (
      <TableHead 
        className="sticky top-0 bg-background cursor-pointer hover:bg-muted/50 select-none"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive ? (
            sortState.direction === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
          )}
        </div>
      </TableHead>
    );
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No transactions to display.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              {title}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({transactions.length} transactions)
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {showClearFilter && onClearFilter && (
                <Button variant="ghost" size="sm" onClick={onClearFilter} className="h-7 px-2">
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => exportTransactionsCsv(sortedTransactions, `cashflow_export_${format(new Date(), 'yyyy-MM-dd')}.csv`)}
              >
                <Download className="h-3 w-3 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="date">Date</SortableHeader>
                  <SortableHeader field="source_account">Account</SortableHeader>
                  <TableHead className="sticky top-0 bg-background max-w-[200px]">Description</TableHead>
                  <SortableHeader field="amount_aud">
                    <span className="w-full text-right">Amount</span>
                  </SortableHeader>
                  <SortableHeader field="L1">Category</SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTransactions.map((tx, idx) => {
                  const isTransfer = tx.is_internal_transfer;
                  return (
                    <TableRow
                      key={tx.id || idx}
                      className={cn(
                        'cursor-pointer hover:bg-muted/50',
                        isTransfer && 'opacity-50'
                      )}
                      onClick={() => setSelectedTx(tx)}
                    >
                      <TableCell className={cn('text-xs whitespace-nowrap', isTransfer && 'text-muted-foreground')}>
                        <span className="flex items-center gap-1">
                          {format(tx.date, 'MMM d, yyyy')}
                          {tx.effective_date && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <CalendarDays className="h-3 w-3 text-muted-foreground/50" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Accrual date set to {format(tx.effective_date, 'MMM d, yyyy')}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className={cn('text-xs', isTransfer && 'text-muted-foreground')}>
                        {tx.source_account}
                      </TableCell>
                      <TableCell className={cn('text-xs max-w-[200px] truncate', isTransfer && 'text-muted-foreground')} title={tx.description}>
                        {tx.description}
                      </TableCell>
                      <TableCell className={cn(
                        'text-xs text-right font-medium',
                        isTransfer ? 'text-muted-foreground' : undefined
                      )}>
                        {formatCompactCurrency(tx.amount_aud)}
                      </TableCell>
                      <TableCell className="text-xs" onClick={(e) => e.stopPropagation()}>
                        {tx.id ? (
                          <CategoryBadge
                            transactionId={tx.id}
                            currentL1={tx.L1 === 'Unknown' ? null : tx.L1}
                            currentL2={tx.L2 === 'Unknown' ? null : tx.L2}
                            description={tx.description}
                            onOptimisticUpdate={onOptimisticUpdate}
                            onBulkUpdate={handleBulkUpdate}
                            onUpdate={onTransactionUpdated ?? (() => {})}
                          />
                        ) : (
                          <span className="text-muted-foreground">{tx.L1}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
          
          <div className="flex items-center justify-between pt-3 border-t mt-3">
            <p className="text-xs text-muted-foreground">
              Showing {visibleTransactions.length} of {transactions.length} transactions
            </p>
            {hasMore && (
              <Button variant="outline" size="sm" onClick={handleShowMore}>
                Show more (+{Math.min(PAGE_SIZE, transactions.length - visibleCount)})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <TransactionDetailModal
        transaction={selectedTx ? {
          id: selectedTx.id,
          transaction_date: format(selectedTx.date, 'yyyy-MM-dd'),
          description: selectedTx.description,
          counterparty: selectedTx.counterparty,
          amount_native: selectedTx.amount_native,
          amount_aud: selectedTx.direction === 'out' ? -selectedTx.amount_aud : selectedTx.amount_aud,
          currency: selectedTx.currency,
          l1_category: selectedTx.L1 === 'Unknown' ? null : selectedTx.L1,
          l2_category: selectedTx.L2 === 'Unknown' ? null : selectedTx.L2,
          source_account_name: selectedTx.source_account,
          transaction_type: selectedTx.direction === 'in' ? 'income' : 'expense',
          is_internal_transfer: selectedTx.is_internal_transfer,
          needs_review: false,
        } : null}
        open={!!selectedTx}
        onOpenChange={(open) => { if (!open) setSelectedTx(null); }}
        onOptimisticUpdate={onOptimisticUpdate}
        onUpdate={onTransactionUpdated}
        linkedAccount={selectedTx ? (transferLinks.get(selectedTx.id) ?? null) : null}
      />
    </>
  );
}
