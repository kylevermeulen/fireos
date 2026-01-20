import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Account {
  id: string;
  name: string;
  currency: 'AUD' | 'USD' | 'IDR';
}

export function BalanceInputForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [amountNative, setAmountNative] = useState('');
  const [balanceDate, setBalanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, currency')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching accounts:', error);
        toast({
          title: 'Failed to load accounts',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setAccounts(data || []);
      }
      setIsLoading(false);
    };

    fetchAccounts();
  }, [user, toast]);

  // Get FX rate for conversion to AUD
  const getFxRate = async (currency: 'AUD' | 'USD' | 'IDR', date: string): Promise<number> => {
    if (currency === 'AUD') return 1;

    const { data } = await supabase
      .from('fx_rates')
      .select('rate')
      .eq('from_currency', currency)
      .eq('to_currency', 'AUD')
      .lte('rate_date', date)
      .order('rate_date', { ascending: false })
      .limit(1)
      .single();

    // If no rate found, use reasonable defaults
    if (!data) {
      if (currency === 'USD') return 1.55;
      if (currency === 'IDR') return 0.0001;
      return 1;
    }
    return data.rate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAccountId || !amountNative || !balanceDate) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const account = accounts.find(a => a.id === selectedAccountId);
      if (!account) throw new Error('Account not found');

      const nativeAmount = parseFloat(amountNative);
      if (isNaN(nativeAmount)) throw new Error('Invalid amount');

      const fxRate = await getFxRate(account.currency, balanceDate);
      const audAmount = nativeAmount * fxRate;

      // Upsert balance (update if exists for same account + date)
      const { error } = await supabase
        .from('balances')
        .upsert(
          {
            account_id: selectedAccountId,
            balance_date: balanceDate,
            amount_native: nativeAmount,
            amount_aud: audAmount,
          },
          { onConflict: 'account_id,balance_date' }
        );

      if (error) throw error;

      toast({
        title: 'Balance added',
        description: `Added ${account.currency} ${nativeAmount.toLocaleString()} to ${account.name} (${balanceDate})`,
      });

      // Reset form
      setAmountNative('');
    } catch (error) {
      console.error('Error adding balance:', error);
      toast({
        title: 'Failed to add balance',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Add Account Balance
        </CardTitle>
        <CardDescription>
          Manually add a balance snapshot for any account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account">Account</Label>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
                disabled={isLoading}
              >
                <SelectTrigger id="account">
                  <SelectValue placeholder={isLoading ? 'Loading...' : 'Select account'} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Balance Date</Label>
              <Input
                id="date"
                type="date"
                value={balanceDate}
                onChange={(e) => setBalanceDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount {selectedAccount ? `(${selectedAccount.currency})` : ''}
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="50000"
              value={amountNative}
              onChange={(e) => setAmountNative(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={isSubmitting || isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Adding...' : 'Add Balance'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
