import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, getCountryFlag } from '@/lib/format';
import { useLatestBalances, useLatestLiabilityBalances } from '@/hooks/useWealthData';
import { Wallet } from 'lucide-react';

export default function Wealth() {
  const accountsWithBalances = useLatestBalances();
  const liabilitiesWithBalances = useLatestLiabilityBalances();

  const isLoading = accountsWithBalances.length === 0;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
            <p className="text-muted-foreground">All assets and liabilities by account</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Assets</CardTitle>
            </CardHeader>
            <CardContent>
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

  // Group accounts by country
  const groupedAccounts = accountsWithBalances.reduce((acc, account) => {
    const country = account.country;
    if (!acc[country]) acc[country] = [];
    acc[country].push(account);
    return acc;
  }, {} as Record<string, typeof accountsWithBalances>);

  const countryOrder = ['AU', 'US', 'ID'];

  // If no accounts, show empty state
  if (accountsWithBalances.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
            <p className="text-muted-foreground">All assets and liabilities by account</p>
          </div>
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">All assets and liabilities by account</p>
        </div>

        {countryOrder.map(country => {
          const accounts = groupedAccounts[country];
          if (!accounts || accounts.length === 0) return null;

          const countryTotal = accounts.reduce((sum, acc) => sum + (acc.latestBalance?.amount_aud || 0), 0);
          const countryName = country === 'AU' ? 'Australia' : country === 'US' ? 'United States' : 'Indonesia';

          return (
            <Card key={country}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {getCountryFlag(country)} {countryName}
                  </span>
                  <span className="text-lg font-mono">
                    {formatCurrency(countryTotal, 'AUD', { compact: true })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{acc.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{acc.account_type}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <Badge variant={acc.liquidity_class === 'liquid' ? 'default' : 'secondary'}>
                          {acc.liquidity_class === 'liquid' ? 'Liquid' : 'Illiquid'}
                        </Badge>
                        <div className="text-right">
                          {acc.latestBalance && acc.currency !== 'AUD' && (
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(acc.latestBalance.amount_native, acc.currency)}
                            </p>
                          )}
                          <span className="font-mono font-medium">
                            {acc.latestBalance 
                              ? formatCurrency(acc.latestBalance.amount_aud, 'AUD')
                              : '—'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader>
            <CardTitle>Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            {liabilitiesWithBalances.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">No liabilities configured</p>
            ) : (
              <div className="space-y-2">
                {liabilitiesWithBalances.map((lib) => (
                  <div key={lib.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium">{lib.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lib.institution} {lib.interest_rate ? `· ${lib.interest_rate}%` : ''}
                      </p>
                    </div>
                    <span className="font-mono font-medium text-destructive">
                      {lib.latestBalance 
                        ? formatCurrency(-lib.latestBalance.balance, 'AUD')
                        : '—'
                      }
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
