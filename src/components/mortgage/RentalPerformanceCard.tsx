import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/format';
import { EditableValue } from './EditableValue';

interface RentalPerformanceCardProps {
  annualRentalIncome: number;
  annualRentalFees: number;
  annualCouncilRates: number;
  annualSewageRates: number;
  annualImprovements: number;
  netRentalIncomeAnnual: number;
  netRentalIncomeMonthly: number;
  netYieldPercent: number;
  interestCoverageRatio: number;
  netPositionAfterInterest: number;
  onEditAnnualIncome: () => void;
  onEditFees: () => void;
  onEditCouncilRates: () => void;
  onEditSewageRates: () => void;
  onEditImprovements: () => void;
}

export function RentalPerformanceCard({
  annualRentalIncome,
  annualRentalFees,
  annualCouncilRates,
  annualSewageRates,
  annualImprovements,
  netRentalIncomeAnnual,
  netRentalIncomeMonthly,
  netYieldPercent,
  interestCoverageRatio,
  netPositionAfterInterest,
  onEditAnnualIncome,
  onEditFees,
  onEditCouncilRates,
  onEditSewageRates,
  onEditImprovements,
}: RentalPerformanceCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">
          Rental Performance (Annual)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Editable Inputs Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Rental Income</p>
            <EditableValue
              value={formatCompactCurrency(annualRentalIncome)}
              onClick={onEditAnnualIncome}
              size="sm"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Rental Fees</p>
            <EditableValue
              value={formatCompactCurrency(annualRentalFees)}
              onClick={onEditFees}
              size="sm"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Council Rates</p>
            <EditableValue
              value={formatCompactCurrency(annualCouncilRates)}
              onClick={onEditCouncilRates}
              size="sm"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Sewage Rates</p>
            <EditableValue
              value={formatCompactCurrency(annualSewageRates)}
              onClick={onEditSewageRates}
              size="sm"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Improvements</p>
            <EditableValue
              value={formatCompactCurrency(annualImprovements)}
              onClick={onEditImprovements}
              size="sm"
            />
          </div>
        </div>

        {/* Calculated Outputs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Net Income/yr</p>
            <p className="text-lg font-bold">{formatCompactCurrency(netRentalIncomeAnnual)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Net Income/mo</p>
            <p className="text-lg font-bold">{formatCompactCurrency(netRentalIncomeMonthly)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Net Yield</p>
            <p className="text-lg font-bold">{netYieldPercent.toFixed(2)}%</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Interest Cover</p>
            <p className="text-lg font-bold">{interestCoverageRatio.toFixed(2)}x</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Net After Interest</p>
            <p className={`text-lg font-bold ${netPositionAfterInterest >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCompactCurrency(netPositionAfterInterest)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
