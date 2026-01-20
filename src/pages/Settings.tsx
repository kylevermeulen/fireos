import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { SnapshotImporter } from '@/components/settings/SnapshotImporter';

export default function Settings() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage accounts, import data, and configure projections</p>
        </div>

        <SnapshotImporter />

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
