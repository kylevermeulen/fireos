import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCompactCurrency, formatPercent, getCountryFlag, getCountryName } from '@/lib/format';
import { useAccounts, useBalances, useLiabilities, useLiabilityBalances, useValuations } from '@/hooks/useWealthData';
import { TimeRange, filterByTimeRange } from '@/contexts/TimeRangeContext';
import { MonthlyChangeChart } from '@/components/dashboard/MonthlyChangeChart';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AccountsMovementProps {
  timeRange: TimeRange;
}

// Unified asset class labels (no separate Crypto/Offset)
type AssetClass = 'Cash' | 'Investments' | 'Retirement' | 'Property' | 'Business' | 'Liabilities';

interface MovementRow {
  id: string;
  name: string;
  assetClass: AssetClass;
  country?: string;
  groupKey: string; // AU, US, ID, Assets, Liabilities
  startValue: number;
  endValue: number;
  delta: number;
  percentChange: number | null;
}

type SortOption = 'abs-delta' | 'gain' | 'loss' | 'end-balance';

function getAssetClassFromAccountType(accountType: string): AssetClass {
  switch (accountType) {
    case 'cash':
    case 'offset': // Offset → Cash
      return 'Cash';
    case 'investment':
    case 'crypto': // Crypto → Investments
      return 'Investments';
    case 'retirement':
      return 'Retirement';
    default:
      return 'Cash';
  }
}

function getGroupKey(row: { country?: string; assetClass: AssetClass }): string {
  if (row.assetClass === 'Property' || row.assetClass === 'Business') {
    return 'Assets';
  }
  if (row.assetClass === 'Liabilities') {
    return 'Liabilities';
  }
  return row.country || 'Other';
}

const GROUP_ORDER = ['AU', 'US', 'ID', 'Assets', 'Liabilities'];

function getGroupLabel(groupKey: string): string {
  if (groupKey === 'Assets') return 'Assets (Property & Business)';
  if (groupKey === 'Liabilities') return 'Liabilities';
  return `${getCountryFlag(groupKey)} ${getCountryName(groupKey)}`;
}

function sortRows(rows: MovementRow[], sortOption: SortOption): MovementRow[] {
  const sorted = [...rows];
  switch (sortOption) {
    case 'abs-delta':
      return sorted.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    case 'gain':
      return sorted.sort((a, b) => b.delta - a.delta);
    case 'loss':
      return sorted.sort((a, b) => a.delta - b.delta);
    case 'end-balance':
      return sorted.sort((a, b) => Math.abs(b.endValue) - Math.abs(a.endValue));
    default:
      return sorted;
  }
}

export function AccountsMovement({ timeRange }: AccountsMovementProps) {
  const [sortOption, setSortOption] = useState<SortOption>('abs-delta');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(GROUP_ORDER));
  
  const { data: accounts } = useAccounts();
  const { data: balances } = useBalances();
  const { data: liabilities } = useLiabilities();
  const { data: liabilityBalances } = useLiabilityBalances();
  const { data: valuations } = useValuations();

  const { movementRows, monthlyDeltas, dateRange } = useMemo(() => {
    if (!accounts || !balances || !liabilities || !liabilityBalances || !valuations) {
      return { movementRows: [], monthlyDeltas: [], dateRange: { start: '', end: '' } };
    }

    // Get all unique dates and filter by time range
    const allDates = new Set<string>();
    balances.forEach(b => allDates.add(b.balance_date));
    liabilityBalances.forEach(lb => allDates.add(lb.balance_date));
    valuations.forEach(v => allDates.add(v.valuation_date));
    
    const sortedDates = Array.from(allDates).sort();
    
    // Create mock snapshots for filtering
    const mockSnapshots = sortedDates.map(d => ({ date: d }));
    const filteredDates = filterByTimeRange(mockSnapshots, timeRange).map(s => s.date);
    
    if (filteredDates.length === 0) {
      return { movementRows: [], monthlyDeltas: [], dateRange: { start: '', end: '' } };
    }

    const startDate = filteredDates[0];
    const endDate = filteredDates[filteredDates.length - 1];

    // Helper to get balance at a specific date (or closest before)
    const getBalanceAtDate = (accountId: string, date: string): number => {
      const accountBalances = balances
        .filter(b => b.account_id === accountId && b.balance_date <= date)
        .sort((a, b) => b.balance_date.localeCompare(a.balance_date));
      return accountBalances.length > 0 ? accountBalances[0].amount_aud : 0;
    };

    const getLiabilityBalanceAtDate = (liabilityId: string, date: string): number => {
      const libBalances = liabilityBalances
        .filter(lb => lb.liability_id === liabilityId && lb.balance_date <= date)
        .sort((a, b) => b.balance_date.localeCompare(a.balance_date));
      return libBalances.length > 0 ? libBalances[0].balance : 0;
    };

    const getValuationAtDate = (assetType: 'home' | 'business', date: string): number => {
      const vals = valuations
        .filter(v => v.asset_type === assetType && v.valuation_date <= date)
        .sort((a, b) => b.valuation_date.localeCompare(a.valuation_date));
      return vals.length > 0 ? vals[0].value_aud : 0;
    };

    // Build movement rows
    const rows: MovementRow[] = [];

    // Accounts
    for (const account of accounts) {
      const startValue = getBalanceAtDate(account.id, startDate);
      const endValue = getBalanceAtDate(account.id, endDate);
      const delta = endValue - startValue;
      const percentChange = startValue !== 0 ? delta / startValue : null;
      const assetClass = getAssetClassFromAccountType(account.account_type);

      rows.push({
        id: account.id,
        name: account.name,
        assetClass,
        country: account.country,
        groupKey: getGroupKey({ country: account.country, assetClass }),
        startValue,
        endValue,
        delta,
        percentChange,
      });
    }

    // Liabilities (negative movement is good)
    for (const liability of liabilities) {
      const startValue = getLiabilityBalanceAtDate(liability.id, startDate);
      const endValue = getLiabilityBalanceAtDate(liability.id, endDate);
      const delta = endValue - startValue;
      const percentChange = startValue !== 0 ? delta / startValue : null;

      rows.push({
        id: liability.id,
        name: liability.name,
        assetClass: 'Liabilities',
        groupKey: 'Liabilities',
        startValue,
        endValue,
        delta,
        percentChange,
      });
    }

    // Valuations (home → Property, business → Business)
    const homeStart = getValuationAtDate('home', startDate);
    const homeEnd = getValuationAtDate('home', endDate);
    if (homeStart > 0 || homeEnd > 0) {
      rows.push({
        id: 'valuation-home',
        name: 'Home',
        assetClass: 'Property',
        groupKey: 'Assets',
        startValue: homeStart,
        endValue: homeEnd,
        delta: homeEnd - homeStart,
        percentChange: homeStart !== 0 ? (homeEnd - homeStart) / homeStart : null,
      });
    }

    const businessStart = getValuationAtDate('business', startDate);
    const businessEnd = getValuationAtDate('business', endDate);
    if (businessStart > 0 || businessEnd > 0) {
      rows.push({
        id: 'valuation-business',
        name: 'Ntegrity',
        assetClass: 'Business',
        groupKey: 'Assets',
        startValue: businessStart,
        endValue: businessEnd,
        delta: businessEnd - businessStart,
        percentChange: businessStart !== 0 ? (businessEnd - businessStart) / businessStart : null,
      });
    }

    // Calculate monthly deltas by asset class (using unified labels)
    const monthlyDeltas: Array<{
      date: string;
      Cash: number;
      Investments: number;
      Retirement: number;
      Property: number;
      Business: number;
      Liabilities: number;
    }> = [];

    for (let i = 1; i < filteredDates.length; i++) {
      const prevDate = filteredDates[i - 1];
      const currDate = filteredDates[i];
      
      const classDeltas: Record<AssetClass, number> = {
        Cash: 0,
        Investments: 0,
        Retirement: 0,
        Property: 0,
        Business: 0,
        Liabilities: 0,
      };

      // Accounts
      for (const account of accounts) {
        const prevBal = getBalanceAtDate(account.id, prevDate);
        const currBal = getBalanceAtDate(account.id, currDate);
        const assetClass = getAssetClassFromAccountType(account.account_type);
        classDeltas[assetClass] += currBal - prevBal;
      }

      // Liabilities
      for (const liability of liabilities) {
        const prevBal = getLiabilityBalanceAtDate(liability.id, prevDate);
        const currBal = getLiabilityBalanceAtDate(liability.id, currDate);
        classDeltas.Liabilities += currBal - prevBal;
      }

      // Valuations
      classDeltas.Property = getValuationAtDate('home', currDate) - getValuationAtDate('home', prevDate);
      classDeltas.Business = getValuationAtDate('business', currDate) - getValuationAtDate('business', prevDate);

      monthlyDeltas.push({
        date: currDate,
        ...classDeltas,
      });
    }

    return {
      movementRows: rows,
      monthlyDeltas,
      dateRange: { start: startDate, end: endDate },
    };
  }, [accounts, balances, liabilities, liabilityBalances, valuations, timeRange]);

  // Group rows by groupKey and sort within groups
  const groupedRows = useMemo(() => {
    const groups = new Map<string, MovementRow[]>();
    
    for (const row of movementRows) {
      const existing = groups.get(row.groupKey) || [];
      existing.push(row);
      groups.set(row.groupKey, existing);
    }

    // Sort rows within each group
    for (const [key, rows] of groups) {
      groups.set(key, sortRows(rows, sortOption));
    }

    return groups;
  }, [movementRows, sortOption]);

  // Calculate group totals
  const groupTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const [key, rows] of groupedRows) {
      const total = rows.reduce((sum, r) => {
        // For liabilities, show the absolute value
        return sum + (key === 'Liabilities' ? -r.endValue : r.endValue);
      }, 0);
      totals.set(key, key === 'Liabilities' ? -total : total);
    }
    return totals;
  }, [groupedRows]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const getDeltaColor = (delta: number, isLiability: boolean): string => {
    if (delta === 0) return 'text-muted-foreground';
    // For liabilities, decrease (negative delta) is good
    if (isLiability) {
      return delta < 0 ? 'text-green-600' : 'text-red-600';
    }
    return delta > 0 ? 'text-green-600' : 'text-red-600';
  };

  if (movementRows.length === 0) {
    return null;
  }

  const orderedGroups = GROUP_ORDER.filter(g => groupedRows.has(g));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">Accounts Movement</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {dateRange.start} → {dateRange.end}
              </p>
            </div>
            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="abs-delta">Largest absolute Δ</SelectItem>
                <SelectItem value="gain">Largest gain</SelectItem>
                <SelectItem value="loss">Largest loss</SelectItem>
                <SelectItem value="end-balance">Largest end balance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="space-y-4">
            <TabsList>
              <TabsTrigger value="table">Movement Table</TabsTrigger>
              <TabsTrigger value="chart">Monthly Deltas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="table" className="space-y-2">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                <div className="col-span-4">Account</div>
                <div className="col-span-2 text-right">Start</div>
                <div className="col-span-2 text-right">End</div>
                <div className="col-span-2 text-right">Δ</div>
                <div className="col-span-2 text-right">%</div>
              </div>

              {/* Grouped Sections */}
              {orderedGroups.map((groupKey) => {
                const rows = groupedRows.get(groupKey) || [];
                const total = groupTotals.get(groupKey) || 0;
                const isExpanded = expandedGroups.has(groupKey);
                const isLiability = groupKey === 'Liabilities';

                return (
                  <Collapsible
                    key={groupKey}
                    open={isExpanded}
                    onOpenChange={() => toggleGroup(groupKey)}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted rounded-md transition-colors">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium text-sm">{getGroupLabel(groupKey)}</span>
                          <span className="text-xs text-muted-foreground">({rows.length})</span>
                        </div>
                        <span className="font-medium text-sm tabular-nums">
                          {formatCompactCurrency(Math.abs(total), 'AUD')}
                        </span>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-1 space-y-px">
                        {rows.map((row) => (
                          <div
                            key={row.id}
                            className="grid grid-cols-12 gap-2 px-3 py-2 text-sm hover:bg-muted/30 rounded-sm"
                          >
                            <div className="col-span-4 flex items-center gap-2 min-w-0">
                              <span className="truncate font-medium">{row.name}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {row.assetClass}
                              </span>
                            </div>
                            <div className="col-span-2 text-right tabular-nums text-muted-foreground">
                              {formatCompactCurrency(row.startValue, 'AUD')}
                            </div>
                            <div className="col-span-2 text-right tabular-nums">
                              {formatCompactCurrency(row.endValue, 'AUD')}
                            </div>
                            <div className={`col-span-2 text-right tabular-nums font-medium ${getDeltaColor(row.delta, isLiability)}`}>
                              {row.delta >= 0 ? '+' : ''}{formatCompactCurrency(row.delta, 'AUD')}
                            </div>
                            <div className="col-span-2 text-right tabular-nums text-muted-foreground">
                              {row.percentChange !== null ? formatPercent(row.percentChange, 1) : '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </TabsContent>
            
            <TabsContent value="chart">
              <MonthlyChangeChart data={monthlyDeltas} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
