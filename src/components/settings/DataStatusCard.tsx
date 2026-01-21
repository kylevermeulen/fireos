import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Database, User, Calendar, Layers } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts, useBalances, useLiabilities, useLiabilityBalances } from '@/hooks/useWealthData';
import { useManualOverrides } from '@/hooks/useManualOverrides';
import { useState } from 'react';

export function DataStatusCard() {
  const { user, sessionReady } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: balances, isLoading: balancesLoading } = useBalances();
  const { data: liabilities, isLoading: liabilitiesLoading } = useLiabilities();
  const { data: liabilityBalances, isLoading: liabilityBalancesLoading } = useLiabilityBalances();
  const { data: overrides, isLoading: overridesLoading } = useManualOverrides();

  const isLoading = accountsLoading || balancesLoading || liabilitiesLoading || liabilityBalancesLoading || overridesLoading;

  // Calculate stats
  const accountCount = accounts?.length ?? 0;
  const balanceCount = balances?.length ?? 0;
  const liabilityCount = liabilities?.length ?? 0;
  const liabilityBalanceCount = liabilityBalances?.length ?? 0;
  const overrideCount = overrides?.length ?? 0;

  // Get latest dates
  const latestBalanceDate = balances?.length 
    ? balances.reduce((a, b) => a.balance_date > b.balance_date ? a : b).balance_date 
    : null;
  
  const latestLiabilityBalanceDate = liabilityBalances?.length 
    ? liabilityBalances.reduce((a, b) => a.balance_date > b.balance_date ? a : b).balance_date 
    : null;

  const latestOverrideDate = overrides?.length
    ? overrides.reduce((a, b) => a.updated_at > b.updated_at ? a : b).updated_at
    : null;

  const handleReloadData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['balances'] }),
        queryClient.invalidateQueries({ queryKey: ['liabilities'] }),
        queryClient.invalidateQueries({ queryKey: ['liability_balances'] }),
        queryClient.invalidateQueries({ queryKey: ['valuations'] }),
        queryClient.invalidateQueries({ queryKey: ['manual_overrides'] }),
        queryClient.invalidateQueries({ queryKey: ['mortgage_overrides'] }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Status
        </CardTitle>
        <CardDescription>Overview of your synced financial data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auth Status */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <User className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email ?? 'Not logged in'}</p>
            <p className="text-xs text-muted-foreground">
              ID: {user?.id?.slice(0, 8)}...
            </p>
          </div>
          <Badge variant={sessionReady && user ? 'default' : 'secondary'}>
            {sessionReady && user ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        {/* Data Counts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Layers className="h-3.5 w-3.5" />
              <span className="text-xs">Accounts</span>
            </div>
            <p className="text-xl font-semibold">{isLoading ? '—' : accountCount}</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Layers className="h-3.5 w-3.5" />
              <span className="text-xs">Balances</span>
            </div>
            <p className="text-xl font-semibold">{isLoading ? '—' : balanceCount}</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Layers className="h-3.5 w-3.5" />
              <span className="text-xs">Liabilities</span>
            </div>
            <p className="text-xl font-semibold">{isLoading ? '—' : liabilityCount}</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Layers className="h-3.5 w-3.5" />
              <span className="text-xs">Overrides</span>
            </div>
            <p className="text-xl font-semibold">{isLoading ? '—' : overrideCount}</p>
          </div>
        </div>

        {/* Latest Dates */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Latest balance
            </span>
            <span className="font-medium">{formatDate(latestBalanceDate)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Latest liability
            </span>
            <span className="font-medium">{formatDate(latestLiabilityBalanceDate)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Latest override
            </span>
            <span className="font-medium">{formatDateTime(latestOverrideDate)}</span>
          </div>
        </div>

        {/* Reload Button */}
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleReloadData}
          disabled={isRefreshing || !user}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Reloading...' : 'Reload Data'}
        </Button>
      </CardContent>
    </Card>
  );
}
