import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import { formatCompactCurrency } from '@/lib/format';
import { CashflowTransaction } from '@/types/cashflow';

interface TransactionsTableProps {
  transactions: CashflowTransaction[];
  title: string;
  onClearFilter?: () => void;
  showClearFilter?: boolean;
}

export function TransactionsTable({ 
  transactions, 
  title, 
  onClearFilter,
  showClearFilter = false,
}: TransactionsTableProps) {
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
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-background">Date</TableHead>
                <TableHead className="sticky top-0 bg-background">Account</TableHead>
                <TableHead className="sticky top-0 bg-background">Counterparty</TableHead>
                <TableHead className="sticky top-0 bg-background max-w-[200px]">Description</TableHead>
                <TableHead className="sticky top-0 bg-background text-right">Amount</TableHead>
                <TableHead className="sticky top-0 bg-background">L1</TableHead>
                <TableHead className="sticky top-0 bg-background">L2</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 100).map((tx, idx) => (
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
          {transactions.length > 100 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Showing first 100 of {transactions.length} transactions
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
