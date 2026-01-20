import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getCountryFlag } from '@/lib/format';

const accounts = [
  { country: 'US', institution: 'Chase', name: 'Savings', balance: 437, currency: 'USD' as const, type: 'Cash', liquid: true },
  { country: 'US', institution: 'Chase', name: 'Checking', balance: 8950, currency: 'USD' as const, type: 'Cash', liquid: true },
  { country: 'US', institution: 'Wealthfront', name: 'Roth', balance: 35386, currency: 'USD' as const, type: 'Retirement', liquid: false },
  { country: 'US', institution: 'RWBaird', name: 'Brokerage', balance: 82182, currency: 'USD' as const, type: 'Investment', liquid: true },
  { country: 'US', institution: 'Vanguard', name: 'Brokerage', balance: 70391, currency: 'USD' as const, type: 'Investment', liquid: true },
  { country: 'US', institution: 'Coinbase', name: 'BTC', balance: 26052, currency: 'USD' as const, type: 'Crypto', liquid: true },
  { country: 'AU', institution: 'CommBank', name: 'Savings', balance: 4000, currency: 'AUD' as const, type: 'Cash', liquid: true },
  { country: 'AU', institution: 'Bank of Melbourne', name: 'Offset', balance: 485765, currency: 'AUD' as const, type: 'Cash', liquid: true },
  { country: 'AU', institution: 'CommSec', name: 'Shares', balance: 520757, currency: 'AUD' as const, type: 'Investment', liquid: true },
  { country: 'AU', institution: 'AustralianSuper', name: 'Kyle', balance: 459265, currency: 'AUD' as const, type: 'Retirement', liquid: false },
  { country: 'AU', institution: 'AustralianSuper', name: 'Richenda', balance: 485000, currency: 'AUD' as const, type: 'Retirement', liquid: false },
  { country: 'AU', institution: 'CoinJar', name: 'BTC', balance: 106750, currency: 'AUD' as const, type: 'Crypto', liquid: true },
  { country: 'ID', institution: 'Permata', name: 'Savings', balance: 4000, currency: 'AUD' as const, type: 'Cash', liquid: true },
];

const liabilities = [
  { name: 'Fixed Mortgage', institution: 'Bank of Melbourne', balance: -941402, rate: '6.24%' },
  { name: 'Variable Mortgage', institution: 'Bank of Melbourne', balance: -565060, rate: '6.49%' },
];

export default function Wealth() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wealth Breakdown</h1>
          <p className="text-muted-foreground">All assets and liabilities by account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {accounts.map((acc, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getCountryFlag(acc.country)}</span>
                    <div>
                      <p className="font-medium">{acc.institution}: {acc.name}</p>
                      <p className="text-sm text-muted-foreground">{acc.type}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <Badge variant={acc.liquid ? 'default' : 'secondary'}>
                      {acc.liquid ? 'Liquid' : 'Illiquid'}
                    </Badge>
                    <span className="font-mono font-medium">
                      {formatCurrency(acc.balance, acc.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {liabilities.map((lib, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{lib.name}</p>
                    <p className="text-sm text-muted-foreground">{lib.institution} · {lib.rate}</p>
                  </div>
                  <span className="font-mono font-medium text-destructive">
                    {formatCurrency(lib.balance, 'AUD')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
