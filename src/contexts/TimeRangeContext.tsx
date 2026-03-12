import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { DateRange } from '@/types/cashflow';

export type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL' | 'custom';

interface TimeRangeContextType {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  customDateRange: DateRange | null;
  setCustomDateRange: (range: DateRange | null) => void;
  // Computed date range based on current selection
  effectiveDateRange: DateRange;
}

const TimeRangeContext = createContext<TimeRangeContextType | null>(null);

// Helper to compute date range from preset
function getDateRangeFromPreset(range: TimeRange, custom: DateRange | null): DateRange {
  if (range === 'custom' && custom) {
    return custom;
  }

  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(to);

  switch (range) {
    case '1M':
      from.setMonth(from.getMonth() - 1);
      break;
    case '3M':
      from.setMonth(from.getMonth() - 3);
      break;
    case '6M':
      from.setMonth(from.getMonth() - 6);
      break;
    case '1Y':
      from.setFullYear(from.getFullYear() - 1);
      break;
    case 'ALL':
      from.setFullYear(2010); // Far enough back to capture all data
      break;
    default:
      from.setFullYear(2010); // Default to ALL
  }

  return { from, to };
}

export function TimeRangeProvider({ children }: { children: ReactNode }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(null);

  const effectiveDateRange = useMemo(() => {
    return getDateRangeFromPreset(timeRange, customDateRange);
  }, [timeRange, customDateRange]);

  return (
    <TimeRangeContext.Provider value={{ 
      timeRange, 
      setTimeRange, 
      customDateRange, 
      setCustomDateRange,
      effectiveDateRange,
    }}>
      {children}
    </TimeRangeContext.Provider>
  );
}

export function useGlobalTimeRange() {
  const context = useContext(TimeRangeContext);
  if (!context) {
    throw new Error('useGlobalTimeRange must be used within a TimeRangeProvider');
  }
  return context;
}

// Helper to filter data by time range (using preset or custom)
export function filterByTimeRange<T extends { date: string }>(
  data: T[],
  range: TimeRange,
  customRange: DateRange | null = null
): T[] {
  if (range === 'ALL' || data.length === 0) return data;

  const dateRange = getDateRangeFromPreset(range, customRange);
  const cutoffDate = dateRange.from;
  const endDate = dateRange.to;

  return data.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate >= cutoffDate && itemDate <= endDate;
  });
}
