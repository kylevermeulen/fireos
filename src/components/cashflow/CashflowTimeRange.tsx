import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CashflowTimeRange as TimeRangeType } from '@/types/cashflow';

interface CashflowTimeRangeProps {
  value: TimeRangeType;
  onChange: (value: TimeRangeType) => void;
}

export function CashflowTimeRange({ value, onChange }: CashflowTimeRangeProps) {
  const ranges: TimeRangeType[] = ['1M', '3M', '6M', '1Y', 'ALL'];

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as TimeRangeType)}
      className="justify-start"
    >
      {ranges.map((range) => (
        <ToggleGroupItem
          key={range}
          value={range}
          aria-label={`Select ${range}`}
          className="px-3 py-1.5 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {range}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
