import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

// Exact account definitions matching the spreadsheet
const SEED_ACCOUNTS = [
  // USA (USD)
  { name: 'Chase: Savings', institution: 'Chase', country: 'US', currency: 'USD' as const, account_type: 'cash' as const, liquidity_class: 'liquid' as const },
  { name: 'Chase: Checking', institution: 'Chase', country: 'US', currency: 'USD' as const, account_type: 'cash' as const, liquidity_class: 'liquid' as const },
  { name: 'Wealthfront: Personal', institution: 'Wealthfront', country: 'US', currency: 'USD' as const, account_type: 'investment' as const, liquidity_class: 'liquid' as const },
  { name: 'RWBaird', institution: 'RW Baird', country: 'US', currency: 'USD' as const, account_type: 'investment' as const, liquidity_class: 'liquid' as const },
  { name: 'Vanguard', institution: 'Vanguard', country: 'US', currency: 'USD' as const, account_type: 'retirement' as const, liquidity_class: 'illiquid' as const },
  { name: 'Wealthfront: Roth', institution: 'Wealthfront', country: 'US', currency: 'USD' as const, account_type: 'retirement' as const, liquidity_class: 'illiquid' as const },
  { name: 'Coinbase', institution: 'Coinbase', country: 'US', currency: 'USD' as const, account_type: 'crypto' as const, liquidity_class: 'liquid' as const },
  
  // Australia (AUD)
  { name: 'CommBank: Savings', institution: 'Commonwealth Bank', country: 'AU', currency: 'AUD' as const, account_type: 'cash' as const, liquidity_class: 'liquid' as const },
  { name: 'Bank of Melbourne: Offset', institution: 'Bank of Melbourne', country: 'AU', currency: 'AUD' as const, account_type: 'offset' as const, liquidity_class: 'liquid' as const },
  { name: 'CommSec Shares', institution: 'CommSec', country: 'AU', currency: 'AUD' as const, account_type: 'investment' as const, liquidity_class: 'liquid' as const },
  { name: 'AustralianSuper: Kyle', institution: 'AustralianSuper', country: 'AU', currency: 'AUD' as const, account_type: 'retirement' as const, liquidity_class: 'illiquid' as const },
  { name: 'AustralianSuper: Richenda', institution: 'AustralianSuper', country: 'AU', currency: 'AUD' as const, account_type: 'retirement' as const, liquidity_class: 'illiquid' as const },
  { name: 'CoinJar', institution: 'CoinJar', country: 'AU', currency: 'AUD' as const, account_type: 'crypto' as const, liquidity_class: 'liquid' as const },
  { name: 'Carbon Startup Investment', institution: 'Private', country: 'AU', currency: 'AUD' as const, account_type: 'investment' as const, liquidity_class: 'illiquid' as const },
  { name: 'Up', institution: 'Up', country: 'AU', currency: 'AUD' as const, account_type: 'cash' as const, liquidity_class: 'liquid' as const },
  { name: 'Bank of Melbourne: Fixed Loan', institution: 'Bank of Melbourne', country: 'AU', currency: 'AUD' as const, account_type: 'cash' as const, liquidity_class: 'liquid' as const },
  { name: 'Bank of Melbourne: Variable Loan', institution: 'Bank of Melbourne', country: 'AU', currency: 'AUD' as const, account_type: 'cash' as const, liquidity_class: 'liquid' as const },
  { name: 'Up Bank: Joint Account', institution: 'Up', country: 'AU', currency: 'AUD' as const, account_type: 'cash' as const, liquidity_class: 'liquid' as const },
  { name: 'American Express', institution: 'American Express', country: 'AU', currency: 'AUD' as const, account_type: 'cash' as const, liquidity_class: 'liquid' as const },

  // Indonesia (IDR)
  { name: 'Permata', institution: 'Permata Bank', country: 'ID', currency: 'IDR' as const, account_type: 'cash' as const, liquidity_class: 'liquid' as const },
];

const SEED_LIABILITIES = [
  { name: 'Fixed Mortgage', institution: 'Bank of Melbourne', liability_type: 'fixed_mortgage' as const, currency: 'AUD' as const, interest_rate: 6.24 },
  { name: 'Variable Mortgage', institution: 'Bank of Melbourne', liability_type: 'variable_mortgage' as const, currency: 'AUD' as const, interest_rate: 6.49, offset_account_name: 'Bank of Melbourne: Offset' },
  { name: 'Ntegrity loan', institution: 'Ntegrity', liability_type: 'loan' as const, currency: 'AUD' as const },
];

export function useAccountSeeder() {
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);

  const seedAccounts = async () => {
    setIsSeeding(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Must be logged in to seed accounts');
      }

      // Seed accounts with upsert
      const accountsToInsert = SEED_ACCOUNTS.map((acc, index) => ({
        ...acc,
        user_id: user.id,
        display_order: index,
        is_active: true,
      }));

      // First, get existing accounts to check for duplicates
      const { data: existingAccounts } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', user.id);

      const existingNames = new Set(existingAccounts?.map(a => a.name) || []);
      const newAccounts = accountsToInsert.filter(a => !existingNames.has(a.name));
      const updateAccounts = accountsToInsert.filter(a => existingNames.has(a.name));

      // Insert new accounts
      if (newAccounts.length > 0) {
        const { error: insertError } = await supabase
          .from('accounts')
          .insert(newAccounts);
        if (insertError) throw insertError;
      }

      // Update existing accounts
      for (const acc of updateAccounts) {
        const { error: updateError } = await supabase
          .from('accounts')
          .update({
            institution: acc.institution,
            country: acc.country,
            currency: acc.currency,
            account_type: acc.account_type,
            liquidity_class: acc.liquidity_class,
            display_order: acc.display_order,
          })
          .eq('user_id', user.id)
          .eq('name', acc.name);
        if (updateError) throw updateError;
      }

      // Get all accounts for liability linking
      const { data: allAccounts } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', user.id);

      const accountMap = new Map(allAccounts?.map(a => [a.name, a.id]) || []);

      // Get existing liabilities
      const { data: existingLiabilities } = await supabase
        .from('liabilities')
        .select('id, name')
        .eq('user_id', user.id);

      const existingLiabilityNames = new Set(existingLiabilities?.map(l => l.name) || []);

      // Seed liabilities
      for (const lib of SEED_LIABILITIES) {
        const liabilityData = {
          name: lib.name,
          institution: lib.institution,
          liability_type: lib.liability_type,
          currency: lib.currency,
          interest_rate: lib.interest_rate,
          user_id: user.id,
          is_active: true,
          offset_account_id: lib.offset_account_name ? accountMap.get(lib.offset_account_name) : null,
        };

        if (existingLiabilityNames.has(lib.name)) {
          // Update existing
          const { error } = await supabase
            .from('liabilities')
            .update({
              institution: liabilityData.institution,
              liability_type: liabilityData.liability_type,
              currency: liabilityData.currency,
              interest_rate: liabilityData.interest_rate,
              offset_account_id: liabilityData.offset_account_id,
            })
            .eq('user_id', user.id)
            .eq('name', lib.name);
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('liabilities')
            .insert(liabilityData);
          if (error) throw error;
        }
      }

      toast({
        title: 'Accounts seeded successfully',
        description: `${newAccounts.length} new accounts, ${updateAccounts.length} updated, ${SEED_LIABILITIES.length} liabilities configured`,
      });

      return { success: true, accountsCreated: newAccounts.length, accountsUpdated: updateAccounts.length };
    } catch (error) {
      console.error('Seed error:', error);
      toast({
        title: 'Seeding failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return { success: false };
    } finally {
      setIsSeeding(false);
    }
  };

  return { seedAccounts, isSeeding };
}
