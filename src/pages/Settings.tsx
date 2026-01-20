import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Database, RefreshCw } from 'lucide-react';

export default function Settings() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage accounts, import data, and configure projections</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Import Data</CardTitle>
            <CardDescription>Upload CSV files to import historical balances, transactions, or holdings</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button variant="outline"><Upload className="mr-2 h-4 w-4" />Import Balances</Button>
            <Button variant="outline"><Upload className="mr-2 h-4 w-4" />Import Transactions</Button>
            <Button variant="outline"><Upload className="mr-2 h-4 w-4" />Import Holdings</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manage Accounts</CardTitle>
            <CardDescription>Add, edit, or remove accounts from your wealth dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Button><Database className="mr-2 h-4 w-4" />Manage Accounts</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Refresh Prices</CardTitle>
            <CardDescription>Fetch latest FX rates and asset prices</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary"><RefreshCw className="mr-2 h-4 w-4" />Refresh All Prices</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
