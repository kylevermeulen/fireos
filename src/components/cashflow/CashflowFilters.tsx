import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CashflowFiltersProps {
  excludeInternalTransfers: boolean;
  onExcludeInternalTransfersChange: (value: boolean) => void;
  showUnknown: boolean;
  onShowUnknownChange: (value: boolean) => void;
}

export function CashflowFilters({
  excludeInternalTransfers,
  onExcludeInternalTransfersChange,
  showUnknown,
  onShowUnknownChange,
}: CashflowFiltersProps) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <Switch
          id="exclude-internal"
          checked={excludeInternalTransfers}
          onCheckedChange={onExcludeInternalTransfersChange}
        />
        <Label htmlFor="exclude-internal" className="text-sm cursor-pointer">
          Exclude internal transfers
        </Label>
      </div>
      
      <div className="flex items-center gap-2">
        <Switch
          id="show-unknown"
          checked={showUnknown}
          onCheckedChange={onShowUnknownChange}
        />
        <Label htmlFor="show-unknown" className="text-sm cursor-pointer">
          Show Unknown
        </Label>
      </div>
    </div>
  );
}
