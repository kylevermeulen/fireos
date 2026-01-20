import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Briefcase, Home } from 'lucide-react';

export type AllocationMode = 'accessible' | 'total';

interface AllocationToggleProps {
  value: AllocationMode;
  onChange: (value: AllocationMode) => void;
}

export function AllocationToggle({ value, onChange }: AllocationToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as AllocationMode)}
      className="justify-start"
    >
      <ToggleGroupItem
        value="accessible"
        aria-label="Accessible portfolio"
        className="gap-1.5 px-3 py-1.5 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <Briefcase className="h-3.5 w-3.5" />
        Accessible
      </ToggleGroupItem>
      <ToggleGroupItem
        value="total"
        aria-label="Total household"
        className="gap-1.5 px-3 py-1.5 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <Home className="h-3.5 w-3.5" />
        Total Household
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
