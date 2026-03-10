import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ArrowUp, ArrowDown, ArrowUpDown, Download } from 'lucide-react';
import { formatCompactCurrency } from '@/lib/format';
import { CashflowTransaction } from '@/types/cashflow';
import { CategoryBadge } from '@/components/transactions/CategoryBadge';
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
}

type SortField = 'date' | 'source_account' | 'counterparty' | 'amount_aud' | 'L1' | 'L2';
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
}: TransactionsTableProps) {
  const [sortState, setSortState] = useState<SortState>({ field: 'amount_aud', direction: 'desc' });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
        case 'counterparty':
          return multiplier * (a.counterparty || '').localeCompare(b.counterparty || '');
        case 'amount_aud':
          return multiplier * (a.amount_aud - b.amount_aud);
        case 'L1':
          return multiplier * (a.L1 || '').localeCompare(b.L1 || '');
        case 'L2':
          return multiplier * (a.L2 || '').localeCompare(b.L2 || '');
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            {title}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({transactions.length} transactions)
            </span>
          </CardTitle>
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
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="date">Date</SortableHeader>
                <SortableHeader field="source_account">Account</SortableHeader>
                <SortableHeader field="counterparty">Counterparty</SortableHeader>
                <TableHead className="sticky top-0 bg-background max-w-[200px]">Description</TableHead>
                <SortableHeader field="amount_aud">
                  <span className="w-full text-right">Amount</span>
                </SortableHeader>
                <SortableHeader field="L1">L1</SortableHeader>
                <SortableHeader field="L2">L2</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleTransactions.map((tx, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {format(tx.date, 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-xs">{tx.source_account}</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate" title={tx.counterparty}>
                    {tx.counterparty}
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate" title={tx.description}>
                    {tx.description}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {formatCompactCurrency(tx.amount_aud)}
                  </TableCell>
                  <TableCell className="text-xs">{tx.L1}</TableCell>
                  <TableCell className="text-xs">{tx.L2}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        
        {/* Show more / pagination info */}
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
  );
}
