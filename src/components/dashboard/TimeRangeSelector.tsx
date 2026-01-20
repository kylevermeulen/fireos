import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const ranges: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as TimeRange)}
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

// Helper to filter snapshots by time range
export function filterByTimeRange<T extends { date: string }>(
  data: T[],
  range: TimeRange,
  referenceDate?: Date
): T[] {
  if (range === 'ALL' || data.length === 0) return data;

  const now = referenceDate || new Date();
  const cutoffDate = new Date(now);

  switch (range) {
    case '1M':
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      break;
    case '3M':
      cutoffDate.setMonth(cutoffDate.getMonth() - 3);
      break;
    case '6M':
      cutoffDate.setMonth(cutoffDate.getMonth() - 6);
      break;
    case '1Y':
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
      break;
  }

  return data.filter((item) => new Date(item.date) >= cutoffDate);
}
