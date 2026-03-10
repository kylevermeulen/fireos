import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, LogOut, User, Shield, Trash2, Database, RotateCcw, Eraser } from 'lucide-react';

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
import { useCategoryRules } from '@/hooks/useCategoryRules';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { rules, applyRules, fetchRules } = useCategoryRules();
  const [isClearing, setIsClearing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [isRecategorising, setIsRecategorising] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

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

        {/* Data Migration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Migration
            </CardTitle>
            <CardDescription>Remap legacy category names to the standardised taxonomy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isMigrating && <Progress value={migrationProgress} className="h-2" />}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                disabled={!user || isMigrating || isRecategorising}
                onClick={async () => {
                  if (!user) return;
                  setIsMigrating(true);
                  setMigrationProgress(0);
                  let totalUpdated = 0;

                  const migrations: { l1: string; l2: string | null; filter: { l1?: string; l1_in?: string[]; l2?: string | null; l2_in?: string[]; l1_is_null?: boolean } }[] = [
                    { l1: 'Restaurants, Cafes & Bars', l2: null, filter: { l1: 'Living Expenses', l2: 'Eating Out' } },
                    { l1: 'Groceries', l2: null, filter: { l1: 'Living Expenses', l2: 'Groceries' } },
                    { l1: 'Utilities & Bills', l2: 'Australia Utility & Bill', filter: { l1: 'Living Expenses', l2_in: ['Internet', 'Phone'] } },
                    { l1: 'Food Delivery & Taxi', l2: null, filter: { l1: 'Transport' } },
                    { l1: 'Entertainment', l2: null, filter: { l1: 'Lifestyle', l2_in: ['Entertainment', 'Books & Media'] } },
                    { l1: 'Travel', l2: null, filter: { l1: 'Lifestyle', l2: 'Travel' } },
                    { l1: 'Shopping', l2: null, filter: { l1: 'Lifestyle', l2: 'Clothing' } },
                    { l1: 'Health & Fitness', l2: null, filter: { l1: 'Lifestyle', l2: 'Health & Fitness' } },
                    { l1: 'Personal Care', l2: null, filter: { l1: 'Lifestyle', l2: 'Personal Care' } },
                    { l1: 'Family', l2: null, filter: { l1: 'Lifestyle', l2: 'Gifts' } },
                    { l1: 'Household', l2: 'Homewares', filter: { l1: 'Housing', l2: 'Homewares' } },
                    { l1: 'Health & Fitness', l2: null, filter: { l1_in: ['Health', 'Health & Fitness'] } },
                    { l1: 'Mortgage', l2: 'Interest', filter: { l1: 'Mortgage', l2: 'Interest' } },
                    { l1: 'Rent', l2: 'Bali Rent', filter: { l1: 'Indonesia Rent' } },
                    { l1: 'Restaurants, Cafes & Bars', l2: null, filter: { l1: 'Indonesia Food & Transport', l2: 'Dining' } },
                    { l1: 'Food Delivery & Taxi', l2: null, filter: { l1: 'Indonesia Food & Transport', l2: 'Grab' } },
                    { l1: 'Groceries', l2: null, filter: { l1: 'Indonesia Food & Transport', l2: 'Groceries' } },
                    { l1: 'Indonesia — Uncategorised', l2: null, filter: { l1: 'Indonesia Food & Transport' } },
                    { l1: 'Shopping', l2: null, filter: { l1: 'Australia Expenses', l2: 'Shopping' } },
                    { l1: 'Food Delivery & Taxi', l2: null, filter: { l1: 'Australia Expenses', l2: 'Fuel-Transport' } },
                    { l1: 'Restaurants, Cafes & Bars', l2: null, filter: { l1: 'Australia Expenses', l2: 'Dining' } },
                    { l1: 'Household', l2: null, filter: { l1: 'Australia Expenses', l2: 'Household' } },
                    { l1: 'Health & Fitness', l2: null, filter: { l1: 'Australia Expenses', l2: 'Health' } },
                    { l1: 'Family', l2: null, filter: { l1: 'Australia Expenses', l2: 'Kids' } },
                    { l1: 'Groceries', l2: null, filter: { l1: 'Australia Expenses', l2: 'Groceries' } },
                    { l1: 'Australia — Uncategorised', l2: null, filter: { l1: 'Australia Expenses' } },
                    { l1: 'Utilities & Bills', l2: 'Indonesia Utility & Bills', filter: { l1: 'Indonesia Bills (Lisa)' } },
                    { l1: 'Travel', l2: 'Accommodation', filter: { l1: 'Travel', l2: 'Accommodation' } },
                    { l1: 'Travel', l2: 'Flights', filter: { l1: 'Travel', l2: 'Flights' } },
                    { l1: 'Travel', l2: null, filter: { l1: 'Travel', l2: 'Other' } },
                    { l1: 'Uncategorised', l2: null, filter: { l1_in: ['Unknown', 'Uncategorised'] } },
                    { l1: 'Uncategorised', l2: null, filter: { l1_is_null: true } },
                  ];

                  try {
                    for (let i = 0; i < migrations.length; i++) {
                      const m = migrations[i];
                      let query = supabase
                        .from('transactions')
                        .update({ l1_category: m.l1, l2_category: m.l2 })
                        .eq('user_id', user.id);

                      if (m.filter.l1) query = query.eq('l1_category', m.filter.l1);
                      if (m.filter.l1_in) query = query.in('l1_category', m.filter.l1_in);
                      if (m.filter.l2) query = query.eq('l2_category', m.filter.l2);
                      if (m.filter.l2_in) query = query.in('l2_category', m.filter.l2_in);
                      if (m.filter.l1_is_null) query = query.is('l1_category', null);
                      // For filters with l1 but no l2 constraint and no l2_in, it's a catch-all for that l1

                      const { data, error } = await query.select('id');
                      if (error) throw error;
                      totalUpdated += (data?.length ?? 0);
                      setMigrationProgress(Math.round(((i + 1) / migrations.length) * 100));
                    }

                    toast({ title: 'Migration complete', description: `${totalUpdated} rows updated` });
                  } catch (err) {
                    toast({ title: 'Migration failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
                  } finally {
                    setIsMigrating(false);
                  }
                }}
              >
                <Database className="mr-2 h-4 w-4" />
                {isMigrating ? 'Migrating…' : 'Remap Legacy Categories'}
              </Button>

              <Button
                variant="secondary"
                disabled={!user || isMigrating || isRecategorising}
                onClick={async () => {
                  if (!user) return;
                   setIsRecategorising(true);
                   const freshRules = await fetchRules();
                   console.log(`[Re-apply] Loaded ${freshRules.length} rules`);

                   try {
                     // Paginate through ALL uncategorised transactions
                     const BATCH = 1000;
                     let from = 0;
                     let totalRows = 0;
                     let matchCount = 0;

                     while (true) {
                       const { data: batch, error } = await supabase
                         .from('transactions')
                         .select('id, description, merchant, counterparty, l1_category')
                         .eq('user_id', user.id)
                         .or('l1_category.eq.Uncategorised,l1_category.is.null')
                         .range(from, from + BATCH - 1);
                       if (error) throw error;
                       if (!batch || batch.length === 0) break;

                       totalRows += batch.length;
                       console.log(`[Re-apply] Batch from=${from}, rows=${batch.length}`);

                       // Log first 3 rows of first batch for diagnosis
                       if (from === 0) {
                         for (const sample of batch.slice(0, 3)) {
                           console.log('[Re-apply] Sample row:', { id: sample.id, counterparty: sample.counterparty, description: sample.description, l1: sample.l1_category });
                         }
                       }

                       for (const tx of batch) {
                         const text = [tx.counterparty, tx.description].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
                         const match = applyRules(text, freshRules);
                         if (match) {
                           console.log(`[Re-apply] Match: "${match.keyword}" → ${match.l1_category} | tx=${tx.id} | text="${text.substring(0, 60)}"`);
                           const { error: updateErr } = await supabase
                             .from('transactions')
                             .update({
                               l1_category: match.l1_category,
                               l2_category: match.l2_category,
                               is_internal_transfer: match.is_internal_transfer,
                               needs_review: match.needs_review,
                             })
                             .eq('id', tx.id);
                           if (updateErr) throw updateErr;
                           matchCount++;
                         }
                       }

                      if (batch.length < BATCH) break;
                      from += BATCH;
                    }

                     console.log(`[Re-apply] Done: matched ${matchCount} of ${totalRows} total uncategorised`);
                     toast({ title: 'Re-categorisation complete', description: `Re-categorised ${matchCount} of ${totalRows} transactions` });
                  } catch (err) {
                    toast({ title: 'Re-categorisation failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
                  } finally {
                    setIsRecategorising(false);
                  }
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {isRecategorising ? 'Processing…' : 'Re-apply Rules to Uncategorised'}
              </Button>
            </div>
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
