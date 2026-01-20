import { Card, CardContent } from '@/components/ui/card';
import { formatCompactCurrency, formatDate } from '@/lib/format';
import { EditableValue } from './EditableValue';
import { cn } from '@/lib/utils';

interface LoanSplitCardProps {
  type: 'fixed' | 'variable';
  balance: number;
  rate: number;
  monthlyRepayment: number;
  estimatedPayoffDate: string | null;
  monthlyInterest: number;
  onEditBalance: () => void;
  onEditRate: () => void;
  onEditRepayment: () => void;
}

export function LoanSplitCard({
  type,
  balance,
  rate,
  monthlyRepayment,
  estimatedPayoffDate,
  monthlyInterest,
  onEditBalance,
  onEditRate,
  onEditRepayment,
}: LoanSplitCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            'text-xs font-medium px-2 py-1 rounded',
            type === 'fixed' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
          )}>
            {type === 'fixed' ? 'FIXED' : 'VARIABLE'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Balance</p>
            <EditableValue
              value={formatCompactCurrency(balance)}
              onClick={onEditBalance}
              size="sm"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Rate</p>
            <EditableValue
              value={`${rate.toFixed(2)}%`}
              onClick={onEditRate}
              size="sm"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Monthly Repayment</p>
            <EditableValue
              value={formatCompactCurrency(monthlyRepayment)}
              onClick={onEditRepayment}
              size="sm"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Est. Interest/mo</p>
            <p className="text-lg font-semibold">{formatCompactCurrency(monthlyInterest)}</p>
          </div>
        </div>

        {estimatedPayoffDate && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Est. payoff: <span className="font-medium text-foreground">{formatDate(estimatedPayoffDate, 'medium')}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
