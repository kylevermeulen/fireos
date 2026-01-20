import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompactCurrency, formatDate } from '@/lib/format';
import { Home, DollarSign } from 'lucide-react';
import { useMortgageData } from '@/hooks/useMortgageData';
import { EditableValue } from '@/components/mortgage/EditableValue';
import { MortgageEditModal } from '@/components/mortgage/MortgageEditModal';
import { MortgageProgressBar } from '@/components/mortgage/MortgageProgressBar';
import { LoanSplitCard } from '@/components/mortgage/LoanSplitCard';
import { MortgageTrendChart } from '@/components/mortgage/MortgageTrendChart';
import { InterestTrendChart } from '@/components/mortgage/InterestTrendChart';
import { PropertyLVRCard } from '@/components/mortgage/PropertyLVRCard';
import { RentalPerformanceCard } from '@/components/mortgage/RentalPerformanceCard';

type ModalType = 
  | 'balance' | 'rate' | 'original' | 'payment' | 'offset' 
  | 'fixed_balance' | 'variable_balance' | 'fixed_rate' | 'variable_rate' 
  | 'fixed_repayment' | 'variable_repayment'
  | 'property_value'
  | 'annual_rental_income' | 'annual_rental_fees' | 'annual_council_rates' | 'annual_sewage_rates' | 'annual_improvements'
  | null;

export default function Mortgage() {
  const { mortgageData, historicalSnapshots, isLoading } = useMortgageData();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Mortgage</h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!mortgageData || mortgageData.totalMortgage === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Mortgage</h1>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Home className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Mortgage Data</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Import your mortgage data to see loan details and offset impact.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Modal field configurations
  const getModalFields = () => {
    switch (activeModal) {
      case 'balance':
        return {
          title: 'Edit Loan Balances',
          fields: [
            { key: 'fixed_balance', label: 'Fixed Loan Balance', value: mortgageData.fixedBalance, liabilityId: mortgageData.fixedMortgageId },
            { key: 'variable_balance', label: 'Variable Loan Balance', value: mortgageData.variableBalance, liabilityId: mortgageData.variableMortgageId },
          ],
        };
      case 'rate':
        return {
          title: 'Edit Interest Rates',
          fields: [
            { key: 'fixed_rate', label: 'Fixed Rate', value: mortgageData.fixedRate, suffix: '%', liabilityId: mortgageData.fixedMortgageId },
            { key: 'variable_rate', label: 'Variable Rate', value: mortgageData.variableRate, suffix: '%', liabilityId: mortgageData.variableMortgageId },
          ],
        };
      case 'original':
        return {
          title: 'Edit Original Loan Amount',
          fields: [
            { key: 'original_loan', label: 'Original Loan', value: mortgageData.originalLoan },
          ],
        };
      case 'payment':
        return {
          title: 'Edit Monthly Payment',
          fields: [
            { key: 'monthly_payment', label: 'Monthly Required Payment', value: mortgageData.monthlyRequiredPayment },
          ],
        };
      case 'offset':
        return {
          title: 'Edit Offset Balance',
          fields: [
            { key: 'offset_balance', label: 'Offset Balance', value: mortgageData.offsetBalance },
          ],
        };
      case 'fixed_balance':
        return {
          title: 'Edit Fixed Loan Balance',
          fields: [
            { key: 'fixed_balance', label: 'Fixed Loan Balance', value: mortgageData.fixedBalance, liabilityId: mortgageData.fixedMortgageId },
          ],
        };
      case 'variable_balance':
        return {
          title: 'Edit Variable Loan Balance',
          fields: [
            { key: 'variable_balance', label: 'Variable Loan Balance', value: mortgageData.variableBalance, liabilityId: mortgageData.variableMortgageId },
          ],
        };
      case 'fixed_rate':
        return {
          title: 'Edit Fixed Rate',
          fields: [
            { key: 'fixed_rate', label: 'Fixed Rate', value: mortgageData.fixedRate, suffix: '%', liabilityId: mortgageData.fixedMortgageId },
          ],
        };
      case 'variable_rate':
        return {
          title: 'Edit Variable Rate',
          fields: [
            { key: 'variable_rate', label: 'Variable Rate', value: mortgageData.variableRate, suffix: '%', liabilityId: mortgageData.variableMortgageId },
          ],
        };
      case 'fixed_repayment':
        return {
          title: 'Edit Fixed Loan Repayment',
          fields: [
            { key: 'fixed_repayment', label: 'Monthly Repayment', value: mortgageData.loanSplits.find(l => l.type === 'fixed')?.monthlyRepayment ?? 0 },
          ],
        };
      case 'variable_repayment':
        return {
          title: 'Edit Variable Loan Repayment',
          fields: [
            { key: 'variable_repayment', label: 'Monthly Repayment', value: mortgageData.loanSplits.find(l => l.type === 'variable')?.monthlyRepayment ?? 0 },
          ],
        };
      case 'property_value':
        return {
          title: 'Edit Property Value',
          fields: [
            { key: 'property_value', label: 'Property Value', value: mortgageData.propertyValue },
          ],
        };
      case 'annual_rental_income':
        return {
          title: 'Edit Annual Rental Income',
          fields: [
            { key: 'annual_rental_income', label: 'Annual Rental Income', value: mortgageData.annualRentalIncome },
          ],
        };
      case 'annual_rental_fees':
        return {
          title: 'Edit Annual Rental Fees',
          fields: [
            { key: 'annual_rental_fees', label: 'Annual Rental Fees', value: mortgageData.annualRentalFees },
          ],
        };
      case 'annual_council_rates':
        return {
          title: 'Edit Annual Council Rates',
          fields: [
            { key: 'annual_council_rates', label: 'Annual Council Rates', value: mortgageData.annualCouncilRates },
          ],
        };
      case 'annual_sewage_rates':
        return {
          title: 'Edit Annual Sewage Rates',
          fields: [
            { key: 'annual_sewage_rates', label: 'Annual Sewage Rates', value: mortgageData.annualSewageRates },
          ],
        };
      case 'annual_improvements':
        return {
          title: 'Edit Annual Improvements',
          fields: [
            { key: 'annual_improvements', label: 'Annual Improvements', value: mortgageData.annualImprovements },
          ],
        };
      default:
        return null;
    }
  };

  const modalConfig = getModalFields();

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Mortgage</h1>

        {/* A) Mortgage Parameters Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Mortgage parameters (click any value to edit)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Loan Balance</p>
                <EditableValue
                  value={formatCompactCurrency(mortgageData.totalMortgage)}
                  onClick={() => setActiveModal('balance')}
                  size="lg"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Weighted Rate</p>
                <EditableValue
                  value={`${mortgageData.weightedRate.toFixed(2)}%`}
                  onClick={() => setActiveModal('rate')}
                  size="lg"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Original Loan</p>
                <EditableValue
                  value={formatCompactCurrency(mortgageData.originalLoan)}
                  onClick={() => setActiveModal('original')}
                  size="lg"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Monthly Payment</p>
                <EditableValue
                  value={formatCompactCurrency(mortgageData.monthlyRequiredPayment)}
                  onClick={() => setActiveModal('payment')}
                  size="lg"
                />
              </div>
            </div>

            {/* Headline KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Total Loan</p>
                <p className="text-xl font-bold">{formatCompactCurrency(mortgageData.totalMortgage)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Offset</p>
                <p className="text-xl font-bold">{formatCompactCurrency(mortgageData.offsetBalance)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Net Mortgage</p>
                <p className="text-xl font-bold">{formatCompactCurrency(mortgageData.mortgageNetOfOffset)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Est. Interest/mo</p>
                <p className="text-xl font-bold">{formatCompactCurrency(mortgageData.totalMonthlyInterest)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* B) Split Loans Module */}
        <div className="grid gap-4 md:grid-cols-2">
          {mortgageData.loanSplits.map(loan => (
            <LoanSplitCard
              key={loan.id}
              type={loan.type}
              balance={loan.balance}
              rate={loan.rate}
              monthlyRepayment={loan.monthlyRepayment}
              estimatedPayoffDate={loan.estimatedPayoffDate}
              monthlyInterest={loan.monthlyInterest}
              onEditBalance={() => setActiveModal(loan.type === 'fixed' ? 'fixed_balance' : 'variable_balance')}
              onEditRate={() => setActiveModal(loan.type === 'fixed' ? 'fixed_rate' : 'variable_rate')}
              onEditRepayment={() => setActiveModal(loan.type === 'fixed' ? 'fixed_repayment' : 'variable_repayment')}
            />
          ))}
        </div>

        {/* C) Offset + Rental Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Offset Amount</p>
              <EditableValue
                value={formatCompactCurrency(mortgageData.offsetBalance)}
                onClick={() => setActiveModal('offset')}
                size="md"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Net Mortgage</p>
              <p className="text-2xl font-bold">{formatCompactCurrency(mortgageData.mortgageNetOfOffset)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Offset Savings</p>
              <p className="text-2xl font-bold text-green-600">{formatCompactCurrency(mortgageData.monthlySavingsFromOffset)}/mo</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Rental Income</p>
                  <p className="text-2xl font-bold">{formatCompactCurrency(mortgageData.monthlyRent)}/mo</p>
                  <p className="text-xs text-muted-foreground mt-1">${mortgageData.weeklyRent.toLocaleString()}/week</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* E) Property + LVR */}
        <PropertyLVRCard
          propertyValue={mortgageData.propertyValue}
          totalLoanBalance={mortgageData.totalMortgage}
          lvr={mortgageData.lvr}
          equity={mortgageData.equity}
          onEditPropertyValue={() => setActiveModal('property_value')}
        />

        {/* F) Rental Performance */}
        <RentalPerformanceCard
          annualRentalIncome={mortgageData.annualRentalIncome}
          annualRentalFees={mortgageData.annualRentalFees}
          annualCouncilRates={mortgageData.annualCouncilRates}
          annualSewageRates={mortgageData.annualSewageRates}
          annualImprovements={mortgageData.annualImprovements}
          netRentalIncomeAnnual={mortgageData.netRentalIncomeAnnual}
          netRentalIncomeMonthly={mortgageData.netRentalIncomeMonthly}
          netYieldPercent={mortgageData.netYieldPercent}
          interestCoverageRatio={mortgageData.interestCoverageRatio}
          netPositionAfterInterest={mortgageData.netPositionAfterInterest}
          onEditAnnualIncome={() => setActiveModal('annual_rental_income')}
          onEditFees={() => setActiveModal('annual_rental_fees')}
          onEditCouncilRates={() => setActiveModal('annual_council_rates')}
          onEditSewageRates={() => setActiveModal('annual_sewage_rates')}
          onEditImprovements={() => setActiveModal('annual_improvements')}
        />

        {/* D) Progress Bar */}
        <Card>
          <CardContent className="p-4">
            <MortgageProgressBar
              originalLoan={mortgageData.originalLoan}
              netMortgage={mortgageData.mortgageNetOfOffset}
              percentPaidOff={mortgageData.percentPaidOff}
            />
          </CardContent>
        </Card>

        {/* D) Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <MortgageTrendChart data={historicalSnapshots} />
          <InterestTrendChart data={historicalSnapshots} />
        </div>

        {/* Footer note */}
        {mortgageData.latestDate && (
          <p className="text-xs text-muted-foreground text-center">
            Data as of {formatDate(mortgageData.latestDate, 'medium')}
          </p>
        )}
      </div>

      {/* Edit Modal */}
      {modalConfig && (
        <MortgageEditModal
          open={activeModal !== null}
          onOpenChange={(open) => !open && setActiveModal(null)}
          title={modalConfig.title}
          fields={modalConfig.fields}
        />
      )}
    </AppLayout>
  );
}
