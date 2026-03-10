import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import {
  useAccounts,
  useBalances,
  useLatestBalances,
  useLatestLiabilityBalances,
  useLiabilities,
  useLiabilityBalances,
  useValuations,
} from '@/hooks/useWealthData';
import { useHoldingsValues } from '@/hooks/useHoldingsValues';
import { Wallet, Upload, Save } from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SnapshotImporter } from '@/components/settings/SnapshotImporter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CurrencyCode = 'AUD' | 'USD' | 'IDR';

interface UnifiedRow {
  id: string;
  name: string;
  group: string;
  groupOrder: number;
  currency: CurrencyCode;
  latestValue: number | null;
  isLiability: boolean;
  entityType: 'account' | 'liability' | 'valuation';
}

function getAccountGroup(
  accountType: string,
  currency: CurrencyCode,
  country: string
): { group: string; order: number } {
  const cur = currency === 'AUD' ? 'AUD' : currency === 'USD' ? 'USD' : 'Other';

  if (cur === 'AUD') {
    if (accountType === 'cash' || accountType === 'offset') return { group: 'AUD — Cash', order: 1 };
    if (accountType === 'investment' || accountType === 'crypto') return { group: 'AUD — Investments', order: 3 };
    if (accountType === 'retirement') return { group: 'AUD — Retirement', order: 4 };
    return { group: 'AUD — Cash', order: 1 };
  }

  if (cur === 'USD') {
    if (accountType === 'cash' || accountType === 'offset') return { group: 'USD — Cash', order: 5 };
    if (accountType === 'retirement') return { group: 'USD — Retirement', order: 6 };
    if (accountType === 'investment' || accountType === 'crypto') return { group: 'USD — Investments', order: 7 };
    return { group: 'USD — Cash', order: 5 };
  }

  return { group: 'Other', order: 8 };
}

export default function Wealth() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const accountsWithBalances = useLatestBalances();
  const liabilitiesWithBalances = useLatestLiabilityBalances();
  const { holdingsValueByAccount } = useHoldingsValues();
  const { data: allBalances } = useBalances();
  const { data: allLiabilityBalances } = useLiabilityBalances();
  const { data: allValuations } = useValuations();
  const { data: allAccounts } = useAccounts();
  const { data: allLiabilities } = useLiabilities();

  const [showImporter, setShowImporter] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  // Selected month for entering values
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Build unified rows
  const rows = useMemo(() => {
    const result: UnifiedRow[] = [];

    // Accounts
    for (const acc of accountsWithBalances) {
      const holdingsVal = holdingsValueByAccount.get(acc.id);
      const latestAud =
        holdingsVal !== undefined && holdingsVal > 0
          ? holdingsVal
          : acc.latestBalance?.amount_aud ?? null;

      const { group, order } = getAccountGroup(acc.account_type, acc.currency as CurrencyCode, acc.country);
      result.push({
        id: acc.id,
        name: acc.name,
        group,
        groupOrder: order,
        currency: acc.currency as CurrencyCode,
        latestValue: latestAud,
        isLiability: false,
        entityType: 'account',
      });
    }

    // Liabilities inline as AUD — Liabilities
    for (const lib of liabilitiesWithBalances) {
      result.push({
        id: lib.id,
        name: lib.name,
        group: 'AUD — Liabilities',
        groupOrder: 2,
        currency: 'AUD',
        latestValue: lib.latestBalance ? -lib.latestBalance.balance : null,
        isLiability: true,
        entityType: 'liability',
      });
    }

    // Valuations (property)
    if (allValuations) {
      // Get latest valuation per name
      const latestByName = new Map<string, { value: number; id: string; type: string }>();
      for (const v of allValuations) {
        const existing = latestByName.get(v.name);
        if (!existing) {
          latestByName.set(v.name, { value: v.value_aud, id: v.id, type: v.asset_type });
        }
      }
      for (const [name, val] of latestByName) {
        const group = val.type === 'home' ? 'AUD — Property' : 'AUD — Investments';
        const order = val.type === 'home' ? 4 : 3;
        result.push({
          id: val.id,
          name,
          group,
          groupOrder: order,
          currency: 'AUD',
          latestValue: val.value,
          isLiability: false,
          entityType: 'valuation',
        });
      }
    }

    result.sort((a, b) => a.groupOrder - b.groupOrder || a.name.localeCompare(b.name));
    return result;
  }, [accountsWithBalances, liabilitiesWithBalances, allValuations, holdingsValueByAccount]);

  // Group rows
  const grouped = useMemo(() => {
    const map = new Map<string, UnifiedRow[]>();
    for (const r of rows) {
      const arr = map.get(r.group) || [];
      arr.push(r);
      map.set(r.group, arr);
    }
    return map;
  }, [rows]);

  // Balance history: collect all months
  const { months, balanceMap, liabilityBalanceMap } = useMemo(() => {
    const monthSet = new Set<string>();
    const bMap = new Map<string, Map<string, number>>(); // accountId -> month -> value
    const lbMap = new Map<string, Map<string, number>>(); // liabilityId -> month -> value

    if (allBalances) {
      for (const b of allBalances) {
        const m = b.balance_date.slice(0, 7);
        monthSet.add(m);
        if (!bMap.has(b.account_id)) bMap.set(b.account_id, new Map());
        bMap.get(b.account_id)!.set(m, b.amount_aud);
      }
    }

    if (allLiabilityBalances) {
      for (const lb of allLiabilityBalances) {
        const m = lb.balance_date.slice(0, 7);
        monthSet.add(m);
        if (!lbMap.has(lb.liability_id)) lbMap.set(lb.liability_id, new Map());
        lbMap.get(lb.liability_id)!.set(m, -lb.balance);
      }
    }

    const months = Array.from(monthSet).sort().reverse();
    return { months, balanceMap: bMap, liabilityBalanceMap: lbMap };
  }, [allBalances, allLiabilityBalances]);

  const isLoading = accountsWithBalances.length === 0 && !allAccounts;

  // Save balance for an account/liability
  const handleSave = useCallback(
    async (row: UnifiedRow) => {
      const val = inputValues[row.id];
      if (!val || !user) return;
      const amount = parseFloat(val);
      if (isNaN(amount)) return;

      setSavingIds((s) => new Set(s).add(row.id));

      const canonicalDate = `${selectedMonth}-01`;

      try {
        if (row.entityType === 'account') {
          // Get FX rate
          let fxRate = 1;
          if (row.currency !== 'AUD') {
            const { data } = await supabase
              .from('fx_rates')
              .select('rate')
              .eq('from_currency', row.currency)
              .eq('to_currency', 'AUD')
              .lte('rate_date', canonicalDate)
              .order('rate_date', { ascending: false })
              .limit(1)
              .single();
            if (data) fxRate = data.rate;
            else fxRate = row.currency === 'USD' ? 1.55 : 0.0001;
          }

          await supabase.from('balances').upsert(
            {
              account_id: row.id,
              balance_date: canonicalDate,
              amount_native: amount,
              amount_aud: amount * fxRate,
            },
            { onConflict: 'account_id,balance_date' }
          );
        } else if (row.entityType === 'liability') {
          await supabase.from('liability_balances').upsert(
            {
              liability_id: row.id,
              balance_date: canonicalDate,
              balance: Math.abs(amount),
            },
            { onConflict: 'liability_id,balance_date' }
          );
        }

        toast.success(`Saved ${row.name} for ${selectedMonth}`);
        setInputValues((v) => ({ ...v, [row.id]: '' }));
        queryClient.invalidateQueries({ queryKey: ['balances'] });
        queryClient.invalidateQueries({ queryKey: ['liability_balances'] });
      } catch (err) {
        toast.error('Failed to save');
      } finally {
        setSavingIds((s) => {
          const n = new Set(s);
          n.delete(row.id);
          return n;
        });
      }
    },
    [inputValues, user, selectedMonth, queryClient]
  );

  // Generate month options (last 24 months)
  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return opts;
  }, []);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Holdings</h1>
          <Card>
            <CardContent className="py-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (rows.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Holdings</h1>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Accounts Yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Go to Settings to seed your accounts and import your historical balance snapshots.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const getCurrencySymbol = (c: CurrencyCode) =>
    c === 'AUD' ? '$' : c === 'USD' ? 'US$' : 'Rp';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Holdings</h1>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImporter(!showImporter)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Snapshots
            </Button>
          </div>
        </div>

        {showImporter && <SnapshotImporter />}

        {/* Current Holdings */}
        <Card>
          <CardHeader>
            <CardTitle>Current Holdings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.from(grouped.entries()).map(([group, items]) => (
              <div key={group}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  {group}
                </h3>
                <div className="space-y-1">
                  {items.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 gap-4"
                    >
                      <span className="font-medium text-sm truncate flex-1">{row.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono text-sm w-28 text-right ${
                            row.latestValue === null
                              ? 'text-muted-foreground'
                              : row.isLiability
                              ? 'text-destructive'
                              : ''
                          }`}
                        >
                          {row.latestValue !== null
                            ? formatCurrency(row.latestValue, row.currency)
                            : '—'}
                        </span>
                        {row.entityType !== 'valuation' && (
                          <>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={`${getCurrencySymbol(row.currency)} value`}
                              className="w-32 h-8 text-sm"
                              value={inputValues[row.id] || ''}
                              onChange={(e) =>
                                setInputValues((v) => ({
                                  ...v,
                                  [row.id]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              disabled={!inputValues[row.id] || savingIds.has(row.id)}
                              onClick={() => handleSave(row)}
                            >
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Balance History */}
        {months.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Balance History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <div className="min-w-max">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-card z-10 min-w-[180px]">
                          Account
                        </TableHead>
                        {months.map((m) => (
                          <TableHead key={m} className="text-right min-w-[100px] font-mono text-xs">
                            {m}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => {
                        const rowMap =
                          row.entityType === 'liability'
                            ? liabilityBalanceMap.get(row.id)
                            : balanceMap.get(row.id);
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">
                              {row.name}
                            </TableCell>
                            {months.map((m) => {
                              const val = rowMap?.get(m);
                              return (
                                <TableCell
                                  key={m}
                                  className={`text-right font-mono text-xs ${
                                    val === undefined
                                      ? 'text-muted-foreground'
                                      : row.isLiability
                                      ? 'text-destructive'
                                      : ''
                                  }`}
                                >
                                  {val !== undefined
                                    ? formatCurrency(val, 'AUD', { compact: true })
                                    : '—'}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
