import { formatCompactCurrency } from '@/lib/format';

interface MortgageProgressBarProps {
  originalLoan: number;
  netMortgage: number;
  percentPaidOff: number;
}

export function MortgageProgressBar({
  originalLoan,
  netMortgage,
  percentPaidOff,
}: MortgageProgressBarProps) {
  const clampedPercent = Math.max(0, Math.min(100, percentPaidOff));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progress to payoff</span>
        <span className="font-medium">{clampedPercent.toFixed(1)}% paid</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Remaining: {formatCompactCurrency(netMortgage)}</span>
        <span>Original: {formatCompactCurrency(originalLoan)}</span>
      </div>
    </div>
  );
}
