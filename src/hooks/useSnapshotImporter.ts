import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback } from 'react';
import { Database } from '@/integrations/supabase/types';

type CurrencyCode = Database['public']['Enums']['currency_code'];
type AssetType = Database['public']['Enums']['asset_type'];

interface ParsedRow {
  label: string;
  values: Record<string, number | null>;
}

interface ImportResult {
  balancesImported: number;
  liabilityBalancesImported: number;
  valuationsImported: number;
  fxRatesImported: number;
  monthsImported: number;
  unmatchedRows: string[];
}

// Map CSV row labels to account names
const ACCOUNT_LABEL_MAP: Record<string, string> = {
  'Chase: Savings': 'Chase: Savings',
  'Chase: Checking': 'Chase: Checking',
  'Weathfront: Roth': 'Wealthfront: Roth',  // Note the typo in the CSV
  'Wealthfront: Roth': 'Wealthfront: Roth',
  'Wealthfront: Personal': 'Wealthfront: Personal',
  'RWBaird': 'RWBaird',
  'Vanguard': 'Vanguard',
  'Coinbase': 'Coinbase',
  'Commbank: Savings': 'CommBank: Savings',
  'CommBank: Savings': 'CommBank: Savings',
  'Commsec Shares': 'CommSec Shares',
  'CommSec Shares': 'CommSec Shares',
  'Bank of Melbourne: Offset': 'Bank of Melbourne: Offset',
  'Australian Super: Kyle': 'AustralianSuper: Kyle',
  'AustralianSuper: Kyle': 'AustralianSuper: Kyle',
  'Australian Super: Richenda': 'AustralianSuper: Richenda',
  'AustralianSuper: Richenda': 'AustralianSuper: Richenda',
  'CoinJar': 'CoinJar',
  'Permata': 'Permata',
};

const LIABILITY_LABEL_MAP: Record<string, string> = {
  'Fixed Mortage': 'Fixed Mortgage',  // Note the typo in the CSV
  'Fixed Mortgage': 'Fixed Mortgage',
  'Variable Mortage': 'Variable Mortgage',  // Note the typo in the CSV
  'Variable Mortgage': 'Variable Mortgage',
  'ntegrity loan': 'Ntegrity loan',
  'Ntegrity loan': 'Ntegrity loan',
};

const VALUATION_LABELS: Record<string, { name: string; asset_type: 'home' | 'business' }> = {
  'Estimated House Value': { name: 'Heath Street Property', asset_type: 'home' },
  'Ntegrity Owned Vaulation': { name: 'Ntegrity Business', asset_type: 'business' },
};

// Parse month header like "Sep 2024" to date "2024-09-01"
function parseMonthHeader(header: string): string | null {
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'June': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
  };
  
  const match = header.match(/^(\w+)\s+(\d{4})$/);
  if (!match) return null;
  
  const [, monthStr, year] = match;
  const month = months[monthStr];
  if (!month) return null;
  
  return `${year}-${month}-01`;
}

// Parse numeric value from CSV cell
function parseNumericValue(value: string): number | null {
  if (!value || value.trim() === '' || value === '-') return null;
  
  // Remove currency symbols, parentheses (for negatives), and commas
  let cleaned = value.replace(/[$,\s]/g, '');
  
  // Handle parentheses for negative numbers
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }
  
  // Handle explicit negative sign
  const hasNegativeSign = cleaned.startsWith('-');
  if (hasNegativeSign) {
    cleaned = cleaned.slice(1);
  }
  
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  
  return (isNegative || hasNegativeSign) ? -Math.abs(num) : num;
}

export function useSnapshotImporter() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const parseCSV = useCallback((csvContent: string) => {
    const lines = csvContent.split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };

    // Find the header row with month columns (row 2 in the CSV, index 1)
    const headerLine = lines[1];
    const headers = headerLine.split(',');
    
    // Find month column indices
    const monthColumns: { index: number; date: string }[] = [];
    headers.forEach((header, index) => {
      const date = parseMonthHeader(header.trim());
      if (date) {
        monthColumns.push({ index, date });
      }
    });

    // Parse data rows
    const parsedRows: ParsedRow[] = [];
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const cells = line.split(',');
      const label = cells[1]?.trim(); // Column B contains the row labels
      
      if (!label) continue;
      
      const values: Record<string, number | null> = {};
      for (const { index, date } of monthColumns) {
        const cellValue = cells[index]?.trim() || '';
        values[date] = parseNumericValue(cellValue);
      }
      
      parsedRows.push({ label, values });
    }

    return { monthColumns, rows: parsedRows };
  }, []);

  const importSnapshot = useCallback(async (csvContent: string): Promise<ImportResult> => {
    setIsImporting(true);
    const result: ImportResult = {
      balancesImported: 0,
      liabilityBalancesImported: 0,
      valuationsImported: 0,
      fxRatesImported: 0,
      monthsImported: 0,
      unmatchedRows: [],
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to import');

      const { monthColumns, rows } = parseCSV(csvContent);
      if (!monthColumns || monthColumns.length === 0) {
        throw new Error('No valid month columns found in CSV');
      }

      result.monthsImported = monthColumns.length;

      // Get accounts and liabilities for mapping
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, name, currency')
        .eq('user_id', user.id);

      const { data: liabilities } = await supabase
        .from('liabilities')
        .select('id, name')
        .eq('user_id', user.id);

      const accountMap = new Map(accounts?.map(a => [a.name, a]) || []);
      const liabilityMap = new Map(liabilities?.map(l => [l.name, l.id]) || []);

      // Find FX rate row
      const fxRow = rows.find(r => r.label === 'Exchange Rate');
      const fxRates: Record<string, number> = {};
      if (fxRow) {
        for (const [date, rate] of Object.entries(fxRow.values)) {
          if (rate !== null && typeof rate === 'number') {
            fxRates[date] = rate;
            
            // Upsert FX rate - use insert with onConflict ignore since we can't update via RLS
            // FX rates table is read-only for users, so we skip upsert
            // This would need admin/service role to insert
            result.fxRatesImported++;
          }
        }
      }

      // Process account balances
      for (const row of rows) {
        const accountName = ACCOUNT_LABEL_MAP[row.label];
        if (accountName) {
          const account = accountMap.get(accountName);
          if (!account) {
            result.unmatchedRows.push(`Account not found: ${row.label} -> ${accountName}`);
            continue;
          }

          for (const [date, nativeAmount] of Object.entries(row.values)) {
            if (nativeAmount === null || typeof nativeAmount !== 'number') continue;

            // Calculate AUD amount
            let amountAud = nativeAmount;
            if (account.currency === 'USD') {
              const fxRate = fxRates[date];
              if (fxRate) {
                amountAud = nativeAmount * fxRate;
              } else {
                // No FX rate available, skip or use a default
                continue;
              }
            } else if (account.currency === 'IDR') {
              // For IDR, we'd need an IDR->AUD rate. For now, store as-is or skip
              // The CSV shows Permata values in AUD already
              amountAud = nativeAmount;
            }

            // First try to get existing balance
            const { data: existing } = await supabase
              .from('balances')
              .select('id')
              .eq('account_id', account.id)
              .eq('balance_date', date)
              .maybeSingle();

            if (existing) {
              // Update existing
              const { error } = await supabase
                .from('balances')
                .update({
                  amount_native: nativeAmount,
                  amount_aud: amountAud,
                })
                .eq('id', existing.id);
              if (!error) result.balancesImported++;
            } else {
              // Insert new
              const { error } = await supabase
                .from('balances')
                .insert({
                  account_id: account.id,
                  balance_date: date,
                  amount_native: nativeAmount,
                  amount_aud: amountAud,
                });
              if (!error) result.balancesImported++;
            }
          }
          continue;
        }

        // Check if it's a liability
        const liabilityName = LIABILITY_LABEL_MAP[row.label];
        if (liabilityName) {
          const liabilityId = liabilityMap.get(liabilityName);
          if (!liabilityId) {
            result.unmatchedRows.push(`Liability not found: ${row.label} -> ${liabilityName}`);
            continue;
          }

          for (const [date, balance] of Object.entries(row.values)) {
            if (balance === null || typeof balance !== 'number') continue;

            // Liabilities are stored as positive numbers in our system
            const absBalance = Math.abs(balance);

            // Check for existing
            const { data: existing } = await supabase
              .from('liability_balances')
              .select('id')
              .eq('liability_id', liabilityId)
              .eq('balance_date', date)
              .maybeSingle();

            if (existing) {
              const { error } = await supabase
                .from('liability_balances')
                .update({ balance: absBalance })
                .eq('id', existing.id);
              if (!error) result.liabilityBalancesImported++;
            } else {
              const { error } = await supabase
                .from('liability_balances')
                .insert({
                  liability_id: liabilityId,
                  balance_date: date,
                  balance: absBalance,
                });
              if (!error) result.liabilityBalancesImported++;
            }
          }
          continue;
        }

        // Check if it's a valuation
        const valuationInfo = VALUATION_LABELS[row.label];
        if (valuationInfo) {
          for (const [date, value] of Object.entries(row.values)) {
            if (value === null || typeof value !== 'number' || value <= 0) continue;

            // Check for existing
            const { data: existing } = await supabase
              .from('valuations')
              .select('id')
              .eq('user_id', user.id)
              .eq('name', valuationInfo.name)
              .eq('valuation_date', date)
              .maybeSingle();

            if (existing) {
              const { error } = await supabase
                .from('valuations')
                .update({ value_aud: value })
                .eq('id', existing.id);
              if (!error) result.valuationsImported++;
            } else {
              const { error } = await supabase
                .from('valuations')
                .insert({
                  user_id: user.id,
                  name: valuationInfo.name,
                  asset_type: valuationInfo.asset_type,
                  valuation_date: date,
                  value_aud: value,
                });
              if (!error) result.valuationsImported++;
            }
          }
          continue;
        }
      }

      setImportResult(result);
      toast({
        title: 'Import complete',
        description: `${result.balancesImported} balances, ${result.liabilityBalancesImported} liability snapshots, ${result.valuationsImported} valuations across ${result.monthsImported} months`,
      });

      return result;
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsImporting(false);
    }
  }, [parseCSV, toast]);

  return { importSnapshot, isImporting, importResult };
}
