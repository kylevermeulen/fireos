import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/format';
import { EditableValue } from './EditableValue';

interface PropertyLVRCardProps {
  propertyValue: number;
  totalLoanBalance: number;
  lvr: number;
  equity: number;
  onEditPropertyValue: () => void;
}

export function PropertyLVRCard({
  propertyValue,
  totalLoanBalance,
  lvr,
  equity,
  onEditPropertyValue,
}: PropertyLVRCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">
          Property & LVR
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Property Value</p>
            <EditableValue
              value={formatCompactCurrency(propertyValue)}
              onClick={onEditPropertyValue}
              size="md"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Loan</p>
            <p className="text-2xl font-bold">{formatCompactCurrency(totalLoanBalance)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">LVR</p>
            <p className="text-2xl font-bold">{lvr.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Equity</p>
            <p className="text-2xl font-bold">{formatCompactCurrency(equity)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
