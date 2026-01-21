import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { formatCompactCurrency } from '@/lib/format';
import { DollarSign, Percent } from 'lucide-react';

interface ProjectionInputsCardProps {
  monthlyContribution: number;
  onMonthlyContributionChange: (value: number) => void;
  sharesReturn: number;
  onSharesReturnChange: (value: number) => void;
  cryptoReturn: number;
  onCryptoReturnChange: (value: number) => void;
  propertyGrowth: number;
  onPropertyGrowthChange: (value: number) => void;
  inflationRate: number;
  onInflationRateChange: (value: number) => void;
}

export function ProjectionInputsCard({
  monthlyContribution,
  onMonthlyContributionChange,
  sharesReturn,
  onSharesReturnChange,
  cryptoReturn,
  onCryptoReturnChange,
  propertyGrowth,
  onPropertyGrowthChange,
  inflationRate,
  onInflationRateChange,
}: ProjectionInputsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Projection Inputs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Monthly Contribution */}
        <div className="space-y-2">
          <Label className="text-sm">Monthly Contribution</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <Input
              type="number"
              value={monthlyContribution}
              onChange={(e) => onMonthlyContributionChange(Number(e.target.value))}
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">/mo</span>
          </div>
        </div>

        {/* Asset Class Returns */}
        <div className="space-y-3">
          <Label className="text-sm flex items-center gap-1">
            <Percent className="h-3 w-3" />
            Annual Returns by Asset Class
          </Label>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shares</span>
                <span className="font-medium">{sharesReturn}%</span>
              </div>
              <Slider
                value={[sharesReturn]}
                onValueChange={([v]) => onSharesReturnChange(v)}
                min={0}
                max={15}
                step={0.5}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Crypto</span>
                <span className="font-medium">{cryptoReturn}%</span>
              </div>
              <Slider
                value={[cryptoReturn]}
                onValueChange={([v]) => onCryptoReturnChange(v)}
                min={-20}
                max={50}
                step={1}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Property</span>
                <span className="font-medium">{propertyGrowth}%</span>
              </div>
              <Slider
                value={[propertyGrowth]}
                onValueChange={([v]) => onPropertyGrowthChange(v)}
                min={0}
                max={10}
                step={0.5}
              />
            </div>
          </div>
        </div>

        {/* Inflation */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Inflation Rate</span>
            <span className="font-medium">{inflationRate}%</span>
          </div>
          <Slider
            value={[inflationRate]}
            onValueChange={([v]) => onInflationRateChange(v)}
            min={0}
            max={8}
            step={0.5}
          />
        </div>
      </CardContent>
    </Card>
  );
}
