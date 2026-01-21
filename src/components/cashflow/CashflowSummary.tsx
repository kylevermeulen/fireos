import { Card, CardContent } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/format';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CashflowSummaryProps {
  totalIncome: number;
  totalSpending: number;
  netPosition: number;
}

export function CashflowSummary({ totalIncome, totalSpending, netPosition }: CashflowSummaryProps) {
  const isPositive = netPosition > 0;
  const isNegative = netPosition < 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Income</p>
            <p className="text-2xl font-bold tabular-nums text-success">
              {formatCompactCurrency(totalIncome)}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Spending</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatCompactCurrency(totalSpending)}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Net Position</p>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-2xl font-bold tabular-nums",
                isPositive && "text-success",
                isNegative && "text-destructive"
              )}>
                {isPositive && '+'}{formatCompactCurrency(netPosition)}
              </p>
              {isPositive && <TrendingUp className="h-5 w-5 text-success" />}
              {isNegative && <TrendingDown className="h-5 w-5 text-destructive" />}
              {!isPositive && !isNegative && <Minus className="h-5 w-5 text-muted-foreground" />}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
