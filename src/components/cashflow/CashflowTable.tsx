import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency, formatPercent } from '@/lib/format';
import { CategoryTotal } from '@/types/cashflow';

interface CashflowTableProps {
  title: string;
  data: CategoryTotal[];
  total: number;
  type: 'income' | 'spending';
}

export function CashflowTable({ title, data, total, type }: CashflowTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <span className="text-sm font-medium">
            Total: {formatCompactCurrency(total)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="max-h-[300px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Category</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: type === 'income' 
                            ? 'hsl(var(--success))' 
                            : `hsl(var(--primary) / ${1 - (i * 0.1)})`,
                        }}
                      />
                      <span className="truncate">{item.category}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCompactCurrency(item.total)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatPercent(item.percentage)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.count}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
