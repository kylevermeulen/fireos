import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent } from '@/lib/format';
import { useAccounts, useBalances, useLiabilities, useLiabilityBalances, useValuations } from '@/hooks/useWealthData';
import { TimeRange, filterByTimeRange } from '@/components/dashboard/TimeRangeSelector';
import { MonthlyChangeChart } from '@/components/dashboard/MonthlyChangeChart';
import { ChevronDown, ChevronUp, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AccountsMovementProps {
  timeRange: TimeRange;
}

type CategoryType = 'Cash' | 'Offset' | 'Investments' | 'Crypto' | 'Retirement' | 'Home' | 'Business' | 'Liabilities';

interface MovementRow {
  id: string;
  name: string;
  category: CategoryType;
  country?: string;
  startValue: number;
  endValue: number;
  delta: number;
  percentChange: number | null;
}

function getCategoryFromAccountType(accountType: string): CategoryType {
  switch (accountType) {
    case 'cash': return 'Cash';
    case 'offset': return 'Offset';
    case 'investment': return 'Investments';
    case 'crypto': return 'Crypto';
    case 'retirement': return 'Retirement';
    default: return 'Cash';
  }
}

export function AccountsMovement({ timeRange }: AccountsMovementProps) {
  const [showAll, setShowAll] = useState(false);
  const [groupBy, setGroupBy] = useState<'none' | 'category' | 'country'>('none');
  
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

      rows.push({
        id: account.id,
        name: account.name,
        category: getCategoryFromAccountType(account.account_type),
        country: account.country,
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
        category: 'Liabilities',
        startValue,
        endValue,
        delta,
        percentChange,
      });
    }

    // Valuations (home, business)
    const homeStart = getValuationAtDate('home', startDate);
    const homeEnd = getValuationAtDate('home', endDate);
    if (homeStart > 0 || homeEnd > 0) {
      rows.push({
        id: 'valuation-home',
        name: 'Home',
        category: 'Home',
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
        name: 'Business',
        category: 'Business',
        startValue: businessStart,
        endValue: businessEnd,
        delta: businessEnd - businessStart,
        percentChange: businessStart !== 0 ? (businessEnd - businessStart) / businessStart : null,
      });
    }

    // Sort by absolute delta descending
    rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    // Calculate monthly deltas by category
    const monthlyDeltas: Array<{
      date: string;
      Cash: number;
      Offset: number;
      Investments: number;
      Crypto: number;
      Retirement: number;
      Home: number;
      Business: number;
      Liabilities: number;
    }> = [];

    for (let i = 1; i < filteredDates.length; i++) {
      const prevDate = filteredDates[i - 1];
      const currDate = filteredDates[i];
      
      const categoryDeltas: Record<CategoryType, number> = {
        Cash: 0,
        Offset: 0,
        Investments: 0,
        Crypto: 0,
        Retirement: 0,
        Home: 0,
        Business: 0,
        Liabilities: 0,
      };

      // Accounts
      for (const account of accounts) {
        const prevBal = getBalanceAtDate(account.id, prevDate);
        const currBal = getBalanceAtDate(account.id, currDate);
        const category = getCategoryFromAccountType(account.account_type);
        categoryDeltas[category] += currBal - prevBal;
      }

      // Liabilities
      for (const liability of liabilities) {
        const prevBal = getLiabilityBalanceAtDate(liability.id, prevDate);
        const currBal = getLiabilityBalanceAtDate(liability.id, currDate);
        categoryDeltas.Liabilities += currBal - prevBal;
      }

      // Valuations
      categoryDeltas.Home = getValuationAtDate('home', currDate) - getValuationAtDate('home', prevDate);
      categoryDeltas.Business = getValuationAtDate('business', currDate) - getValuationAtDate('business', prevDate);

      monthlyDeltas.push({
        date: currDate,
        ...categoryDeltas,
      });
    }

    return {
      movementRows: rows,
      monthlyDeltas,
      dateRange: { start: startDate, end: endDate },
    };
  }, [accounts, balances, liabilities, liabilityBalances, valuations, timeRange]);

  // Filter and group
  const displayRows = useMemo(() => {
    let rows = movementRows;

    if (groupBy === 'category') {
      const grouped = new Map<CategoryType, MovementRow>();
      for (const row of movementRows) {
        const existing = grouped.get(row.category);
        if (existing) {
          existing.startValue += row.startValue;
          existing.endValue += row.endValue;
          existing.delta += row.delta;
        } else {
          grouped.set(row.category, {
            id: row.category,
            name: row.category,
            category: row.category,
            startValue: row.startValue,
            endValue: row.endValue,
            delta: row.delta,
            percentChange: null,
          });
        }
      }
      // Recalculate percent change
      rows = Array.from(grouped.values()).map(r => ({
        ...r,
        percentChange: r.startValue !== 0 ? r.delta / r.startValue : null,
      }));
      rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    } else if (groupBy === 'country') {
      const grouped = new Map<string, MovementRow>();
      for (const row of movementRows) {
        const key = row.country || row.category;
        const existing = grouped.get(key);
        if (existing) {
          existing.startValue += row.startValue;
          existing.endValue += row.endValue;
          existing.delta += row.delta;
        } else {
          grouped.set(key, {
            id: key,
            name: key,
            category: row.category,
            country: row.country,
            startValue: row.startValue,
            endValue: row.endValue,
            delta: row.delta,
            percentChange: null,
          });
        }
      }
      rows = Array.from(grouped.values()).map(r => ({
        ...r,
        percentChange: r.startValue !== 0 ? r.delta / r.startValue : null,
      }));
      rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    }

    if (!showAll) {
      return rows.slice(0, 10);
    }
    return rows;
  }, [movementRows, showAll, groupBy]);

  const getCategoryColor = (category: CategoryType): string => {
    const colors: Record<CategoryType, string> = {
      Cash: 'bg-chart-1/20 text-chart-1',
      Offset: 'bg-chart-1/20 text-chart-1',
      Investments: 'bg-chart-2/20 text-chart-2',
      Crypto: 'bg-chart-4/20 text-chart-4',
      Retirement: 'bg-chart-3/20 text-chart-3',
      Home: 'bg-chart-5/20 text-chart-5',
      Business: 'bg-primary/20 text-primary',
      Liabilities: 'bg-destructive/20 text-destructive',
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  if (movementRows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-semibold">Accounts Movement</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-md border">
                <Button
                  variant={groupBy === 'none' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-r-none text-xs"
                  onClick={() => setGroupBy('none')}
                >
                  Individual
                </Button>
                <Button
                  variant={groupBy === 'category' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-none border-x text-xs"
                  onClick={() => setGroupBy('category')}
                >
                  Category
                </Button>
                <Button
                  variant={groupBy === 'country' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-l-none text-xs"
                  onClick={() => setGroupBy('country')}
                >
                  Country
                </Button>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Changes from {dateRange.start} to {dateRange.end}
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="space-y-4">
            <TabsList>
              <TabsTrigger value="table">Movement Table</TabsTrigger>
              <TabsTrigger value="chart">Monthly Deltas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="table">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account / Asset</TableHead>
                      <TableHead className="hidden sm:table-cell">Category</TableHead>
                      <TableHead className="text-right">Start (AUD)</TableHead>
                      <TableHead className="text-right">End (AUD)</TableHead>
                      <TableHead className="text-right">Δ (AUD)</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {row.delta > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : row.delta < 0 ? (
                              <TrendingDown className="h-4 w-4 text-red-500 flex-shrink-0" />
                            ) : (
                              <ArrowUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <span className="truncate">{row.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary" className={getCategoryColor(row.category)}>
                            {row.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.startValue, 'AUD', { compact: true })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.endValue, 'AUD', { compact: true })}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${
                          row.category === 'Liabilities' 
                            ? row.delta < 0 ? 'text-green-600' : row.delta > 0 ? 'text-red-600' : ''
                            : row.delta > 0 ? 'text-green-600' : row.delta < 0 ? 'text-red-600' : ''
                        }`}>
                          {row.delta >= 0 ? '+' : ''}{formatCurrency(row.delta, 'AUD', { compact: true })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden sm:table-cell">
                          {row.percentChange !== null ? formatPercent(row.percentChange, 1) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {movementRows.length > 10 && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAll(!showAll)}
                    className="text-muted-foreground"
                  >
                    {showAll ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Show Top 10
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Show All ({movementRows.length})
                      </>
                    )}
                  </Button>
                </div>
              )}
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
