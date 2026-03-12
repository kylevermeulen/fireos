import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useGlobalTimeRange, TimeRange } from '@/contexts/TimeRangeContext';
import { DateRange } from '@/types/cashflow';

const presetRanges: { value: TimeRange; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: 'All' },
];

export function GlobalTimeRangeSelector() {
  const { timeRange, setTimeRange, customDateRange, setCustomDateRange } = useGlobalTimeRange();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date } | undefined>(
    customDateRange ? { from: customDateRange.from, to: customDateRange.to } : undefined
  );

  const handlePresetChange = (value: string) => {
    if (value && value !== 'custom') {
      setTimeRange(value as TimeRange);
    }
  };

  const handleCustomSelect = () => {
    setIsCalendarOpen(true);
  };

  const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    setTempRange(range);
    if (range?.from && range?.to) {
      const dateRange: DateRange = { from: range.from, to: range.to };
      setCustomDateRange(dateRange);
      setTimeRange('custom');
      setIsCalendarOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <ToggleGroup
        type="single"
        value={timeRange === 'custom' ? '' : timeRange}
        onValueChange={handlePresetChange}
        className="justify-start"
      >
        {presetRanges.map((range) => (
          <ToggleGroupItem
            key={range.value}
            value={range.value}
            aria-label={`Select ${range.label}`}
            className="px-3 py-1.5 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {range.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={timeRange === 'custom' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              "text-sm gap-2",
              timeRange === 'custom' && "bg-primary text-primary-foreground"
            )}
            onClick={handleCustomSelect}
          >
            <CalendarIcon className="h-4 w-4" />
            {timeRange === 'custom' && customDateRange ? (
              <span className="hidden sm:inline">
                {format(customDateRange.from, 'MMM d')} - {format(customDateRange.to, 'MMM d')}
              </span>
            ) : (
              <span className="hidden sm:inline">Choose Dates</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover z-50" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={tempRange?.from}
            selected={tempRange as { from: Date; to?: Date } | undefined}
            onSelect={handleDateSelect}
            numberOfMonths={2}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Legacy component for backward compatibility
export { GlobalTimeRangeSelector as TimeRangeSelector };

// Re-export types
export type { TimeRange };
