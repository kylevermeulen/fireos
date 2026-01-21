import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCompactCurrency } from '@/lib/format';
import { calculateScenarios, ScenarioResult } from '@/hooks/useFireCalculations';
import { FlaskConical } from 'lucide-react';

interface FireScenarioTableProps {
  investableAssets: number;
  annualizedSpend: number;
  monthlySurplus: number;
}

export function FireScenarioTable({ 
  investableAssets, 
  annualizedSpend, 
  monthlySurplus 
}: FireScenarioTableProps) {
  const scenarios = useMemo(() => 
    calculateScenarios(investableAssets, annualizedSpend, monthlySurplus),
    [investableAssets, annualizedSpend, monthlySurplus]
  );

  // Filter to show most relevant scenarios (base case + extremes)
  const displayScenarios = useMemo(() => {
    // Show: 3%, 4%, 4.5% SWR at 5% return with 0% shock
    // Plus 4% SWR at different returns and shocks
    return scenarios.filter(s => 
      (s.spendingShock === 0 && s.realReturn === 5 && [3, 4, 4.5].includes(s.swr)) ||
      (s.swr === 4 && s.spendingShock === 0 && [3, 7].includes(s.realReturn)) ||
      (s.swr === 4 && s.realReturn === 5 && [10, 20].includes(s.spendingShock))
    );
  }, [scenarios]);

  const getYearsText = (years: number | null) => {
    if (years === null) return '—';
    if (years === 0) return '✓ FI';
    return `${years.toFixed(1)}y`;
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'text-emerald-600';
    if (percent >= 75) return 'text-blue-600';
    if (percent >= 50) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FlaskConical className="h-5 w-5" />
          Scenario Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SWR</TableHead>
              <TableHead>Return</TableHead>
              <TableHead>Spend Δ</TableHead>
              <TableHead className="text-right">FI Number</TableHead>
              <TableHead className="text-right">Progress</TableHead>
              <TableHead className="text-right">Years to FI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayScenarios.map((scenario, idx) => (
              <TableRow 
                key={idx}
                className={scenario.swr === 4 && scenario.realReturn === 5 && scenario.spendingShock === 0 
                  ? 'bg-muted/50 font-medium' 
                  : ''
                }
              >
                <TableCell>{scenario.swr}%</TableCell>
                <TableCell>{scenario.realReturn}%</TableCell>
                <TableCell>
                  {scenario.spendingShock === 0 
                    ? 'Base' 
                    : `+${scenario.spendingShock}%`
                  }
                </TableCell>
                <TableCell className="text-right">
                  {formatCompactCurrency(scenario.fiNumber)}
                </TableCell>
                <TableCell className={`text-right ${getProgressColor(scenario.fiPercent)}`}>
                  {scenario.fiPercent.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">
                  {getYearsText(scenario.yearsToFi)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground mt-3">
          Base case highlighted. SWR = Safe Withdrawal Rate. Years to FI assumes current savings rate continues.
        </p>
      </CardContent>
    </Card>
  );
}
