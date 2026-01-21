import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useWealthSnapshots } from '@/hooks/useWealthData';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet } from 'lucide-react';
import { ProjectionScenarioSelector, SCENARIOS, ScenarioType } from '@/components/projections/ProjectionScenarioSelector';
import { ProjectionInputsCard } from '@/components/projections/ProjectionInputsCard';
import { ProjectionChart } from '@/components/projections/ProjectionChart';
import { AssetBreakdownProjection } from '@/components/projections/AssetBreakdownProjection';

export default function Projections() {
  const { latestSnapshot, isLoading } = useWealthSnapshots();
  
  const [scenario, setScenario] = useState<ScenarioType>('base');
  const [monthlyContribution, setMonthlyContribution] = useState(5000);
  const [showInflationAdjusted, setShowInflationAdjusted] = useState(true);
  
  const selectedScenario = SCENARIOS.find(s => s.type === scenario)!;
  const [sharesReturn, setSharesReturn] = useState(selectedScenario.sharesReturn);
  const [cryptoReturn, setCryptoReturn] = useState(selectedScenario.cryptoReturn);
  const [propertyGrowth, setPropertyGrowth] = useState(selectedScenario.propertyGrowth);
  const [inflationRate, setInflationRate] = useState(selectedScenario.inflationRate);

  const handleScenarioChange = (newScenario: ScenarioType) => {
    setScenario(newScenario);
    const s = SCENARIOS.find(sc => sc.type === newScenario)!;
    setSharesReturn(s.sharesReturn);
    setCryptoReturn(s.cryptoReturn);
    setPropertyGrowth(s.propertyGrowth);
    setInflationRate(s.inflationRate);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projections</h1>
            <p className="text-muted-foreground">Wealth forecast with asset-class returns</p>
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </AppLayout>
    );
  }

  if (!latestSnapshot) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projections</h1>
            <p className="text-muted-foreground">Wealth forecast</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Data Yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Import your historical data first to enable projections.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const startingValues = {
    investmentsAud: latestSnapshot.investmentsAud,
    cryptoAud: latestSnapshot.cryptoAud,
    homeValue: latestSnapshot.homeValue,
    businessValue: latestSnapshot.businessValue,
    cashAud: latestSnapshot.cashAud,
    retirementAud: latestSnapshot.retirementAud,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projections</h1>
            <p className="text-muted-foreground">5-year wealth forecast with asset-class returns</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="inflation"
              checked={showInflationAdjusted}
              onCheckedChange={setShowInflationAdjusted}
            />
            <Label htmlFor="inflation" className="text-sm">Inflation Adjusted</Label>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <ProjectionScenarioSelector selected={scenario} onSelect={handleScenarioChange} />
          <div className="lg:col-span-2">
            <ProjectionInputsCard
              monthlyContribution={monthlyContribution}
              onMonthlyContributionChange={setMonthlyContribution}
              sharesReturn={sharesReturn}
              onSharesReturnChange={setSharesReturn}
              cryptoReturn={cryptoReturn}
              onCryptoReturnChange={setCryptoReturn}
              propertyGrowth={propertyGrowth}
              onPropertyGrowthChange={setPropertyGrowth}
              inflationRate={inflationRate}
              onInflationRateChange={setInflationRate}
            />
          </div>
        </div>

        <ProjectionChart
          startingValues={startingValues}
          monthlyContribution={monthlyContribution}
          sharesReturn={sharesReturn}
          cryptoReturn={cryptoReturn}
          propertyGrowth={propertyGrowth}
          inflationRate={inflationRate}
          showInflationAdjusted={showInflationAdjusted}
        />

        <AssetBreakdownProjection
          startingValues={startingValues}
          monthlyContribution={monthlyContribution}
          sharesReturn={sharesReturn}
          cryptoReturn={cryptoReturn}
          propertyGrowth={propertyGrowth}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projection Assumptions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>• Monthly contributions split: 70% to investments, 30% to cash</p>
            <p>• Retirement grows at 80% of shares return rate</p>
            <p>• Property includes home and business valuations</p>
            <p>• Inflation adjustment shows purchasing power in today's dollars</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
