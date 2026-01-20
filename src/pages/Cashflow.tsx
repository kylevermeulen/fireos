import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Cashflow() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cashflow</h1>
          <p className="text-muted-foreground">Income vs spending analysis</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Not Configured Yet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Cashflow tracking requires transaction data which is not included in the monthly balance snapshots.
            </p>
            <p className="text-muted-foreground mt-2">
              To enable this feature, you can:
            </p>
            <ul className="list-disc list-inside mt-2 text-muted-foreground space-y-1">
              <li>Import a transaction history CSV file</li>
              <li>Add manual monthly income/expense totals</li>
              <li>Connect a bank integration for automatic tracking</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4 italic">
              Note: Cashflow data cannot be derived from monthly balance changes, as those include investment gains/losses.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
