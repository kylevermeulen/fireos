import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { FireSettings } from '@/hooks/useFireCalculations';
import { Settings2 } from 'lucide-react';

interface FireSettingsCardProps {
  settings: FireSettings;
  onChange: (settings: FireSettings) => void;
  defaultAnnualSpend: number;
}

export function FireSettingsCard({ settings, onChange, defaultAnnualSpend }: FireSettingsCardProps) {
  const handleSwrChange = (value: number[]) => {
    onChange({ ...settings, swrPercent: value[0] });
  };

  const handleReturnChange = (value: number[]) => {
    onChange({ ...settings, realReturnPercent: value[0] });
  };

  const handleSpendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : null;
    onChange({ ...settings, targetAnnualSpend: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="h-5 w-5" />
          FIRE Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SWR Slider */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Safe Withdrawal Rate</Label>
            <span className="text-sm font-medium">{settings.swrPercent}%</span>
          </div>
          <Slider
            value={[settings.swrPercent]}
            onValueChange={handleSwrChange}
            min={2}
            max={5}
            step={0.5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Traditional 4% rule = 25x annual expenses
          </p>
        </div>

        {/* Real Return Slider */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Expected Real Return</Label>
            <span className="text-sm font-medium">{settings.realReturnPercent}%</span>
          </div>
          <Slider
            value={[settings.realReturnPercent]}
            onValueChange={handleReturnChange}
            min={2}
            max={8}
            step={0.5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            After-inflation investment return
          </p>
        </div>

        {/* Target Annual Spend */}
        <div className="space-y-2">
          <Label>Target Annual Spend (Override)</Label>
          <Input
            type="number"
            placeholder={`Default: $${Math.round(defaultAnnualSpend).toLocaleString()}`}
            value={settings.targetAnnualSpend ?? ''}
            onChange={handleSpendChange}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use calculated average
          </p>
        </div>

        {/* Include toggles */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="include-retirement" className="cursor-pointer">
              Include Retirement
            </Label>
            <Switch
              id="include-retirement"
              checked={settings.includeRetirement}
              onCheckedChange={(checked) => 
                onChange({ ...settings, includeRetirement: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="include-crypto" className="cursor-pointer">
              Include Crypto
            </Label>
            <Switch
              id="include-crypto"
              checked={settings.includeCrypto}
              onCheckedChange={(checked) => 
                onChange({ ...settings, includeCrypto: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="include-offset" className="cursor-pointer">
              Include Offset Account
            </Label>
            <Switch
              id="include-offset"
              checked={settings.includeOffset}
              onCheckedChange={(checked) => 
                onChange({ ...settings, includeOffset: checked })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
