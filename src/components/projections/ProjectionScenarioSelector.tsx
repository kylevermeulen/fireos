import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

export type ScenarioType = 'conservative' | 'base' | 'aggressive';

interface Scenario {
  type: ScenarioType;
  label: string;
  description: string;
  icon: React.ReactNode;
  sharesReturn: number;
  cryptoReturn: number;
  propertyGrowth: number;
  inflationRate: number;
}

export const SCENARIOS: Scenario[] = [
  {
    type: 'conservative',
    label: 'Conservative',
    description: 'Lower returns, higher inflation',
    icon: <TrendingDown className="h-4 w-4" />,
    sharesReturn: 5,
    cryptoReturn: 0,
    propertyGrowth: 2,
    inflationRate: 4,
  },
  {
    type: 'base',
    label: 'Base Case',
    description: 'Historical averages',
    icon: <Minus className="h-4 w-4" />,
    sharesReturn: 7,
    cryptoReturn: 10,
    propertyGrowth: 4,
    inflationRate: 2.5,
  },
  {
    type: 'aggressive',
    label: 'Aggressive',
    description: 'Strong growth, low inflation',
    icon: <TrendingUp className="h-4 w-4" />,
    sharesReturn: 10,
    cryptoReturn: 20,
    propertyGrowth: 6,
    inflationRate: 2,
  },
];

interface ProjectionScenarioSelectorProps {
  selected: ScenarioType;
  onSelect: (scenario: ScenarioType) => void;
}

export function ProjectionScenarioSelector({ selected, onSelect }: ProjectionScenarioSelectorProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Scenario</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {SCENARIOS.map((scenario) => (
            <Button
              key={scenario.type}
              variant={selected === scenario.type ? 'default' : 'outline'}
              className={cn(
                'flex flex-col h-auto py-3 px-2',
                selected === scenario.type && 'ring-2 ring-primary'
              )}
              onClick={() => onSelect(scenario.type)}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {scenario.icon}
                <span className="text-sm font-medium">{scenario.label}</span>
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                {scenario.description}
              </span>
            </Button>
          ))}
        </div>
        
        {/* Show selected scenario details */}
        {selected && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {SCENARIOS.filter(s => s.type === selected).map(s => (
              <>
                <div key="shares" className="flex justify-between">
                  <span className="text-muted-foreground">Shares</span>
                  <span className="font-medium">{s.sharesReturn}%</span>
                </div>
                <div key="crypto" className="flex justify-between">
                  <span className="text-muted-foreground">Crypto</span>
                  <span className="font-medium">{s.cryptoReturn}%</span>
                </div>
                <div key="property" className="flex justify-between">
                  <span className="text-muted-foreground">Property</span>
                  <span className="font-medium">{s.propertyGrowth}%</span>
                </div>
                <div key="inflation" className="flex justify-between">
                  <span className="text-muted-foreground">Inflation</span>
                  <span className="font-medium">{s.inflationRate}%</span>
                </div>
              </>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
