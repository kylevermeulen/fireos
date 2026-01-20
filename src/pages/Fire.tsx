import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Fire() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FIRE Calculator</h1>
          <p className="text-muted-foreground">Financial Independence, Retire Early</p>
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
              FIRE calculations require accurate annual spending data which is not included in the monthly balance snapshots.
            </p>
            <p className="text-muted-foreground mt-2">
              To enable this feature, you need to:
            </p>
            <ul className="list-disc list-inside mt-2 text-muted-foreground space-y-1">
              <li>Import transaction history to calculate actual spending</li>
              <li>Or manually enter your estimated annual expenses</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4 italic">
              Once spending data is available, FIRE progress will be calculated as: Investable Assets / (Annual Spend × FIRE Multiple)
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
