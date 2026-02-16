import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccounts, useBalances } from '@/hooks/useWealthData';
import { useAllHoldings, useLatestPrices } from '@/hooks/useHoldings';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompactCurrency, formatDate, formatPercent } from '@/lib/format';
import { PieChart, TrendingUp, TrendingDown, Briefcase, Bitcoin, LineChart } from 'lucide-react';
import { GlobalTimeRangeSelector } from '@/components/dashboard/GlobalTimeRangeSelector';
import { useGlobalTimeRange, filterByTimeRange } from '@/contexts/TimeRangeContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { HoldingsTable } from '@/components/investments/HoldingsTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type InvestmentCategory = 'public' | 'crypto' | 'private';

interface AccountWithBalance {
  id: string;
  name: string;
  institution: string;
  country: string;
  category: InvestmentCategory;
  balance: number;
  delta: number;
  date: string;
}

export default function Investments() {
  const { timeRange, customDateRange } = useGlobalTimeRange();
  const [expandedGroups, setExpandedGroups] = useState<Set<InvestmentCategory>>(
    new Set(['public', 'crypto', 'private'])
  );
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: balances, isLoading: balancesLoading } = useBalances();
  const { data: allHoldings, isLoading: holdingsLoading } = useAllHoldings();
  const { data: priceMap, isLoading: pricesLoading } = useLatestPrices();

  const isLoading = accountsLoading || balancesLoading || holdingsLoading || pricesLoading;

  const toggleGroup = (group: InvestmentCategory) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const investmentData = useMemo(() => {
    if (!accounts || !balances) {
      return null;
    }

    const investmentAccounts = accounts.filter(
      a => a.account_type === 'investment' || a.account_type === 'crypto'
    );

    if (investmentAccounts.length === 0) {
      return null;
    }

    // Calculate holdings-based value per account
    const holdingsValueByAccount = new Map<string, number>();
    if (allHoldings && priceMap) {
      for (const h of allHoldings) {
        const price = priceMap.get(h.symbol);
        const value = h.quantity * (price?.price || 0);
        holdingsValueByAccount.set(
          h.account_id,
          (holdingsValueByAccount.get(h.account_id) || 0) + value
        );
      }
    }

    const accountIds = new Set(investmentAccounts.map(a => a.id));
    const relevantBalances = balances.filter(b => accountIds.has(b.account_id));

    const dateSet = new Set(relevantBalances.map(b => b.balance_date));
    const allDates = Array.from(dateSet).sort();

    const snapshots = allDates.map(date => {
      const dateBalances = relevantBalances.filter(b => b.balance_date === date);
      const total = dateBalances.reduce((sum, b) => sum + b.amount_aud, 0);
      return { date, total };
    });

    const filteredSnapshots = filterByTimeRange(snapshots, timeRange, customDateRange);

    const startSnapshot = filteredSnapshots[0];
    const endSnapshot = filteredSnapshots[filteredSnapshots.length - 1];

    const startBalance = startSnapshot?.total || 0;
    const latestDate = endSnapshot?.date || '';

    // Get start balance per account (for delta calc)
    const startByAccount = new Map<string, number>();
    for (const balance of relevantBalances) {
      if (startSnapshot && balance.balance_date === startSnapshot.date) {
        startByAccount.set(balance.account_id, balance.amount_aud);
      }
    }

    // Build account details — use holdings value when available, else latest balance
    const latestByAccount = new Map<string, { balance: number; date: string }>();
    for (const balance of relevantBalances) {
      if (endSnapshot && balance.balance_date === endSnapshot.date) {
        latestByAccount.set(balance.account_id, { balance: balance.amount_aud, date: balance.balance_date });
      }
    }

    const accountDetails: AccountWithBalance[] = investmentAccounts.map(account => {
      const holdingsValue = holdingsValueByAccount.get(account.id);
      const hasHoldings = holdingsValue !== undefined && holdingsValue > 0;
      const latest = latestByAccount.get(account.id);
      
      // Prefer holdings-calculated value over balance snapshot
      const balance = hasHoldings ? holdingsValue : (latest?.balance || 0);
      const accountStartBalance = startByAccount.get(account.id) || 0;
      const accountDelta = balance - accountStartBalance;

      let category: InvestmentCategory = 'public';
      if (account.account_type === 'crypto') {
        category = 'crypto';
      }
      if (account.liquidity_class === 'illiquid' && account.account_type === 'investment') {
        category = 'private';
      }

      return {
        id: account.id,
        name: account.name,
        institution: account.institution,
        country: account.country,
        category,
        balance,
        delta: accountDelta,
        date: latest?.date || '',
      };
    }).sort((a, b) => b.balance - a.balance);

    const byCategory = {
      public: accountDetails.filter(a => a.category === 'public'),
      crypto: accountDetails.filter(a => a.category === 'crypto'),
      private: accountDetails.filter(a => a.category === 'private'),
    };

    const publicTotal = byCategory.public.reduce((sum, a) => sum + a.balance, 0);
    const cryptoTotal = byCategory.crypto.reduce((sum, a) => sum + a.balance, 0);
    const privateTotal = byCategory.private.reduce((sum, a) => sum + a.balance, 0);

    const publicDelta = byCategory.public.reduce((sum, a) => sum + a.delta, 0);
    const cryptoDelta = byCategory.crypto.reduce((sum, a) => sum + a.delta, 0);
    const privateDelta = byCategory.private.reduce((sum, a) => sum + a.delta, 0);

    const totalBalance = publicTotal + cryptoTotal + privateTotal;
    const delta = totalBalance - startBalance;
    const deltaPercent = startBalance > 0 ? delta / startBalance : 0;

    return {
      totalBalance,
      delta,
      deltaPercent,
      latestDate,
      byCategory,
      categoryTotals: {
        public: { balance: publicTotal, delta: publicDelta },
        crypto: { balance: cryptoTotal, delta: cryptoDelta },
        private: { balance: privateTotal, delta: privateDelta },
      },
    };
  }, [accounts, balances, allHoldings, priceMap, timeRange, customDateRange]);

  const timeRangeLabel = timeRange === 'custom' ? 'Period' : timeRange;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Investments</h1>
              <p className="text-muted-foreground">Public markets, crypto & private investments</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!investmentData) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Investments</h1>
            <p className="text-muted-foreground">Public markets, crypto & private investments</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <PieChart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Investment Accounts</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Add investment accounts to track your portfolio.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const isPositive = investmentData.delta >= 0;

  const categoryConfig: Record<InvestmentCategory, { label: string; icon: React.ReactNode }> = {
    public: { label: 'Public Markets', icon: <LineChart className="h-4 w-4" /> },
    crypto: { label: 'Crypto', icon: <Bitcoin className="h-4 w-4" /> },
    private: { label: 'Private Investments', icon: <Briefcase className="h-4 w-4" /> },
  };

  const renderCategorySection = (category: InvestmentCategory) => {
    const accounts = investmentData.byCategory[category];
    const totals = investmentData.categoryTotals[category];
    const config = categoryConfig[category];
    const isExpanded = expandedGroups.has(category);

    if (accounts.length === 0 && totals.balance === 0) {
      return null;
    }

    const isTotalPositive = totals.delta >= 0;

    return (
      <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleGroup(category)}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
              <div className="flex items-center gap-2">
                {config.icon}
                <span className="font-medium">{config.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">({accounts.length})</span>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-sm ${isTotalPositive ? 'text-success' : 'text-destructive'}`}>
                {isTotalPositive ? '+' : ''}{formatCompactCurrency(totals.delta)}
              </span>
              <span className="font-medium">{formatCompactCurrency(totals.balance)}</span>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Balance (AUD)</TableHead>
                <TableHead className="text-right">Change ({timeRangeLabel})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => {
                const isAccountPositive = account.delta >= 0;
                return (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.name}</span>
                        <span className="text-xs text-muted-foreground">Investments</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCompactCurrency(account.balance)}
                    </TableCell>
                    <TableCell className={`text-right ${isAccountPositive ? 'text-success' : 'text-destructive'}`}>
                      {isAccountPositive ? '+' : ''}{formatCompactCurrency(account.delta)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Investments</h1>
            <p className="text-muted-foreground">Public markets, crypto & private investments</p>
          </div>
          <GlobalTimeRangeSelector />
        </div>

        {/* Top stat cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Investments</p>
                  <p className="text-2xl font-bold">{formatCompactCurrency(investmentData.totalBalance)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    As of {formatDate(investmentData.latestDate, 'short')}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <PieChart className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Change ({timeRangeLabel})</p>
                  <p className={`text-2xl font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                    {isPositive ? '+' : ''}{formatCompactCurrency(investmentData.delta)}
                  </p>
                  <p className={`text-xs mt-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
                    {isPositive ? '+' : ''}{formatPercent(investmentData.deltaPercent)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  {isPositive ? (
                    <TrendingUp className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grouped Sections */}
        <Card>
          <CardHeader>
            <CardTitle>Investment Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {renderCategorySection('public')}
            {renderCategorySection('crypto')}
            {renderCategorySection('private')}
          </CardContent>
        </Card>

        {/* Holdings Detail */}
        {(() => {
          const allInvestmentAccounts = [
            ...investmentData.byCategory.public,
            ...investmentData.byCategory.crypto,
            ...investmentData.byCategory.private,
          ];
          if (allInvestmentAccounts.length === 0) return null;
          return (
            <Card>
              <CardHeader>
                <CardTitle>Holdings Detail</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={allInvestmentAccounts[0]?.id}>
                  <TabsList className="flex-wrap h-auto gap-1">
                    {allInvestmentAccounts.map(acc => (
                      <TabsTrigger key={acc.id} value={acc.id} className="text-xs">
                        {acc.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {allInvestmentAccounts.map(acc => {
                    const origAccount = accounts?.find(a => a.id === acc.id);
                    const currency = origAccount?.currency || 'AUD';
                    return (
                      <TabsContent key={acc.id} value={acc.id}>
                        <HoldingsTable
                          accountId={acc.id}
                          accountName={acc.name}
                          accountCurrency={currency as 'AUD' | 'USD' | 'IDR'}
                        />
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          );
        })()}

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Investments include public market holdings (ETFs, shares), cryptocurrency, and private investments.
              Add individual holdings per account to track performance. Use "Refresh Prices" to fetch live market data.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
