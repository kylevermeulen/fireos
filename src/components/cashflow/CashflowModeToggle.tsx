import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CashflowMode } from '@/types/cashflow';

interface CashflowModeToggleProps {
  mode: CashflowMode;
  onChange: (mode: CashflowMode) => void;
}

export function CashflowModeToggle({ mode, onChange }: CashflowModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Mode:</span>
      <ToggleGroup 
        type="single" 
        value={mode} 
        onValueChange={(value) => value && onChange(value as CashflowMode)}
        className="bg-muted/50 rounded-lg p-1"
      >
        <ToggleGroupItem 
          value="amortised" 
          className="text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
        >
          Amortised
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="cashflow" 
          className="text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
        >
          Cashflow
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
