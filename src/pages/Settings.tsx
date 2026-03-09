import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, LogOut, User, Shield, Trash2 } from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { SnapshotImporter } from '@/components/settings/SnapshotImporter';
import { BankImporter } from '@/components/cashflow/BankImporter';
import { BalanceInputForm } from '@/components/settings/BalanceInputForm';
import { DataStatusCard } from '@/components/settings/DataStatusCard';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Sign out failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/auth');
    }
  };

  const clearImportedSnapshotData = async () => {
    if (!user) return;

    setIsClearing(true);
    try {
      // Accounts -> balances
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id);
      if (accountsError) throw accountsError;

      const accountIds = (accounts ?? []).map((a) => a.id);
      if (accountIds.length > 0) {
        const { error } = await supabase.from('balances').delete().in('account_id', accountIds);
        if (error) throw error;
      }

      // Liabilities -> liability_balances
      const { data: liabilities, error: liabilitiesError } = await supabase
        .from('liabilities')
        .select('id')
        .eq('user_id', user.id);
      if (liabilitiesError) throw liabilitiesError;

      const liabilityIds = (liabilities ?? []).map((l) => l.id);
      if (liabilityIds.length > 0) {
        const { error } = await supabase
          .from('liability_balances')
          .delete()
          .in('liability_id', liabilityIds);
        if (error) throw error;
      }

      // Valuations: delete only the snapshot-imported names (include legacy names too)
      const importedValuationNames = [
        'Heath Street Property',
        'Ntegrity Business',
        '97 Heath Street',
        'Ntegrity owned valuation',
      ];
      const { error: valuationsError } = await supabase
        .from('valuations')
        .delete()
        .eq('user_id', user.id)
        .in('name', importedValuationNames);
      if (valuationsError) throw valuationsError;

      toast({
        title: 'Snapshot data cleared',
        description: 'Now re-import your snapshot CSV to regenerate balances and valuations.',
      });
    } catch (err) {
      toast({
        title: 'Clear failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage accounts, import data, and configure projections</p>
        </div>

        {/* Auth Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Authentication
            </CardTitle>
            <CardDescription>Your current session status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{user?.email}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs">
                      Authenticated
                    </Badge>
                    <span className="text-xs text-muted-foreground">ID: {user?.id?.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Status Card */}
        <DataStatusCard />

        {/* Bank Transaction Importer */}
        <BankImporter />

        {/* Snapshot Importer (legacy balance snapshots) */}
        <SnapshotImporter />

        {/* Balance Input Form */}
        <BalanceInputForm />

        {/* Reset snapshot-imported data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Clear Imported Snapshot Data
            </CardTitle>
            <CardDescription>
              Deletes your imported balances, liability snapshots, and the two imported valuations so you can re-import cleanly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={!user || isClearing}>
                  {isClearing ? 'Clearing…' : 'Clear Snapshot Data'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear imported snapshot data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your imported snapshot balances and liability balances. You can restore them by importing your CSV again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearImportedSnapshotData} disabled={!user || isClearing}>
                    Confirm Clear
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Refresh Prices</CardTitle>
            <CardDescription>Fetch latest FX rates and asset prices</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh All Prices
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
