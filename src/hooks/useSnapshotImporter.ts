import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback } from 'react';
import { Database } from '@/integrations/supabase/types';

type CurrencyCode = Database['public']['Enums']['currency_code'];
type AssetType = Database['public']['Enums']['asset_type'];

type RawCell = string | null;

interface ParsedRow {
  label: string;
  values: Record<string, RawCell>; // date -> raw string from CSV
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
  'Weathfront: Roth': 'Wealthfront: Roth', // Note the typo in the CSV
  'Wealthfront: Roth': 'Wealthfront: Roth',
  'Wealthfront: Personal': 'Wealthfront: Personal',
  RWBaird: 'RWBaird',
  Vanguard: 'Vanguard',
  Coinbase: 'Coinbase',
  'Commbank: Savings': 'CommBank: Savings',
  'CommBank: Savings': 'CommBank: Savings',
  'Commsec Shares': 'CommSec Shares',
  'CommSec Shares': 'CommSec Shares',
  'Bank of Melbourne: Offset': 'Bank of Melbourne: Offset',
  'Australian Super: Kyle': 'AustralianSuper: Kyle',
  'AustralianSuper: Kyle': 'AustralianSuper: Kyle',
  'Australian Super: Richenda': 'AustralianSuper: Richenda',
  'AustralianSuper: Richenda': 'AustralianSuper: Richenda',
  CoinJar: 'CoinJar',
  Permata: 'Permata',
};

const LIABILITY_LABEL_MAP: Record<string, string> = {
  'Fixed Mortage': 'Fixed Mortgage', // Note the typo in the CSV
  'Fixed Mortgage': 'Fixed Mortgage',
  'Variable Mortage': 'Variable Mortgage', // Note the typo in the CSV
  'Variable Mortgage': 'Variable Mortgage',
  'ntegrity loan': 'Ntegrity loan',
  'Ntegrity loan': 'Ntegrity loan',
};

const VALUATION_LABELS: Record<string, { name: string; asset_type: AssetType }>
  = {
    'Estimated House Value': { name: 'Heath Street Property', asset_type: 'home' },
    'Ntegrity Owned Vaulation': { name: 'Ntegrity Business', asset_type: 'business' },
  };

// Parse month header like "Sep 2024" to date "2024-09-01"
function parseMonthHeader(header: string): string | null {
  const months: Record<string, string> = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    May: '05',
    Jun: '06',
    June: '06',
    Jul: '07',
    Aug: '08',
    Sep: '09',
    Oct: '10',
    Nov: '11',
    Dec: '12',
  };

  const match = header.match(/^(\w+)\s+(\d{4})$/);
  if (!match) return null;

  const [, monthStr, year] = match;
  const month = months[monthStr];
  if (!month) return null;

  return `${year}-${month}-01`;
}

/**
 * Quote-aware CSV line parser (RFC4180-ish).
 * Ensures cells like "547,846" are kept as one cell (comma preserved in raw string).
 */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // Escaped quote inside quoted field
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

/**
 * Parses currency/number strings into JS numbers.
 * Returns null for blank/invalid.
 */
function parseMoney(value: string | number): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  if (typeof value !== 'string') return null;

  let s = value.trim();
  if (s === '' || s === '-') return null;

  // Parentheses indicate negative (accounting format)
  let negative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1).trim();
  }

  // Explicit negative sign
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1).trim();
  }

  // Remove currency symbols and spaces (keep separators)
  s = s.replace(/\s+/g, '');
  s = s.replace(/\$/g, '');
  s = s.replace(/^Rp/i, '');

  if (s === '' || s === '-') return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // Decide format by the last separator position
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');

    if (lastComma > lastDot) {
      // 1.234,56 => thousands '.' and decimal ','
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 => thousands ',' and decimal '.'
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Requirement: comma-only => treat commas as thousands separators
    s = s.replace(/,/g, '');
  } else if (hasDot) {
    // Dot-only: if looks like thousands grouping (e.g. 500.000 or 1.234.567), remove dots
    const parts = s.split('.');
    const looksThousands =
      parts.length > 1 && parts.slice(1).every((p) => p.length === 3 && /^\d+$/.test(p));
    if (looksThousands) s = s.replace(/\./g, '');
  }

  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;

  return negative ? -Math.abs(n) : n;
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function useSnapshotImporter() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const parseCSV = useCallback((csvContent: string) => {
    const lines = csvContent.split(/\r?\n/);
    if (lines.length < 2) return { monthColumns: [], rows: [] as ParsedRow[] };

    // Find the header row with month columns (row 2 in the CSV, index 1)
    const headerLine = lines[1] ?? '';
    const headers = parseCsvLine(headerLine);

    // Find month column indices
    const monthColumns: { index: number; date: string }[] = [];
    headers.forEach((header, index) => {
      const date = parseMonthHeader((header ?? '').trim());
      if (date) monthColumns.push({ index, date });
    });

    // Parse data rows (keep raw strings; no numeric coercion)
    const parsedRows: ParsedRow[] = [];
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;

      const cells = parseCsvLine(line);
      const label = (cells[1] ?? '').trim(); // Column B contains the row labels
      if (!label) continue;

      const values: Record<string, RawCell> = {};
      for (const { index, date } of monthColumns) {
        const raw = (cells[index] ?? '').replace(/\r$/, '').trim();
        values[date] = raw === '' ? null : raw;
      }

      parsedRows.push({ label, values });
    }

    return { monthColumns, rows: parsedRows };
  }, []);

  const importSnapshot = useCallback(
    async (csvContent: string): Promise<ImportResult> => {
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Must be logged in to import');

        const { monthColumns, rows } = parseCSV(csvContent);
        if (!monthColumns || monthColumns.length === 0) {
          throw new Error('No valid month columns found in CSV');
        }

        result.monthsImported = monthColumns.length;

        // Get accounts and liabilities for mapping
        const { data: accounts, error: accountsError } = await supabase
          .from('accounts')
          .select('id, name, currency')
          .eq('user_id', user.id);
        if (accountsError) throw accountsError;

        const { data: liabilities, error: liabilitiesError } = await supabase
          .from('liabilities')
          .select('id, name')
          .eq('user_id', user.id);
        if (liabilitiesError) throw liabilitiesError;

        const accountMap = new Map(
          (accounts ?? []).map((a) => [a.name, a as { id: string; name: string; currency: CurrencyCode }])
        );
        const liabilityMap = new Map((liabilities ?? []).map((l) => [l.name, l.id]));

        // Find FX rate row
        const fxRow = rows.find((r) => r.label === 'Exchange Rate');
        const fxRates: Record<string, number> = {};
        if (fxRow) {
          for (const { date } of monthColumns) {
            const raw = fxRow.values[date];
            const rate = raw == null ? null : parseMoney(raw);
            if (rate != null) fxRates[date] = rate;
          }
        }

        // Debug output (one month) for known fields to validate raw vs parsed
        const debugDate = monthColumns[0]?.date;
        if (debugDate) {
          const debugTargets = [
            { kind: 'Account', want: 'CommSec Shares' },
            { kind: 'Account', want: 'Bank of Melbourne: Offset' },
            { kind: 'Liability', want: 'Fixed Mortgage' },
          ];

          for (const t of debugTargets) {
            const row = rows.find((r) => {
              if (t.kind === 'Account') return ACCOUNT_LABEL_MAP[r.label] === t.want;
              return LIABILITY_LABEL_MAP[r.label] === t.want;
            });
            const raw = row?.values?.[debugDate] ?? null;
            const parsed = raw == null ? null : parseMoney(raw);
            console.log(
              `[snapshot-import][debug] ${t.kind}="${t.want}" Date=${debugDate} Raw="${raw ?? ''}" Parsed=${parsed ?? 'null'}`
            );
          }
        }

        // Build upsert batches
        const balancesToUpsert: Array<{
          account_id: string;
          balance_date: string;
          amount_native: number;
          amount_aud: number;
        }> = [];

        const liabilityBalancesToUpsert: Array<{
          liability_id: string;
          balance_date: string;
          balance: number;
        }> = [];

        const valuationsToUpsert: Array<{
          user_id: string;
          name: string;
          asset_type: AssetType;
          valuation_date: string;
          value_aud: number;
        }> = [];

        const fxRatesToUpsert: Array<{
          rate_date: string;
          from_currency: CurrencyCode;
          to_currency: CurrencyCode;
          rate: number;
        }> = [];

        // Process rows
        for (const row of rows) {
          const accountName = ACCOUNT_LABEL_MAP[row.label];
          if (accountName) {
            const account = accountMap.get(accountName);
            if (!account) {
              result.unmatchedRows.push(`Account not found: ${row.label} -> ${accountName}`);
              continue;
            }

            for (const { date } of monthColumns) {
              const raw = row.values[date];
              const nativeAmount = raw == null ? null : parseMoney(raw);
              if (nativeAmount == null) continue;

              // Calculate AUD amount
              let amountAud = nativeAmount;
              if (account.currency === 'USD') {
                const fxRate = fxRates[date];
                if (!fxRate) continue;
                amountAud = nativeAmount * fxRate;
              } else if (account.currency === 'IDR') {
                // CSV already provides Permata values in AUD-equivalent in this dataset
                amountAud = nativeAmount;
              }

              balancesToUpsert.push({
                account_id: account.id,
                balance_date: date,
                amount_native: nativeAmount,
                amount_aud: amountAud,
              });
            }
            continue;
          }

          const liabilityName = LIABILITY_LABEL_MAP[row.label];
          if (liabilityName) {
            const liabilityId = liabilityMap.get(liabilityName);
            if (!liabilityId) {
              result.unmatchedRows.push(`Liability not found: ${row.label} -> ${liabilityName}`);
              continue;
            }

            for (const { date } of monthColumns) {
              const raw = row.values[date];
              const parsed = raw == null ? null : parseMoney(raw);
              if (parsed == null) continue;

              // Liabilities are stored as positive numbers in our system
              const absBalance = Math.abs(parsed);
              liabilityBalancesToUpsert.push({
                liability_id: liabilityId,
                balance_date: date,
                balance: absBalance,
              });
            }
            continue;
          }

          const valuationInfo = VALUATION_LABELS[row.label];
          if (valuationInfo) {
            for (const { date } of monthColumns) {
              const raw = row.values[date];
              const value = raw == null ? null : parseMoney(raw);
              if (value == null || value <= 0) continue;

              valuationsToUpsert.push({
                user_id: user.id,
                name: valuationInfo.name,
                asset_type: valuationInfo.asset_type,
                valuation_date: date,
                value_aud: value,
              });
            }
            continue;
          }
        }

        // Optional FX rate persistence (may be blocked by current write policies)
        for (const { date } of monthColumns) {
          const rate = fxRates[date];
          if (rate == null) continue;
          fxRatesToUpsert.push({
            rate_date: date,
            from_currency: 'USD',
            to_currency: 'AUD',
            rate,
          });
        }

        // Upsert snapshot data (force overwrite on re-import)
        if (balancesToUpsert.length > 0) {
          for (const batch of chunk(balancesToUpsert, 500)) {
            const { error } = await supabase
              .from('balances')
              .upsert(batch, { onConflict: 'account_id,balance_date' });
            if (error) throw error;
          }
          result.balancesImported = balancesToUpsert.length;
        }

        if (liabilityBalancesToUpsert.length > 0) {
          for (const batch of chunk(liabilityBalancesToUpsert, 500)) {
            const { error } = await supabase
              .from('liability_balances')
              .upsert(batch, { onConflict: 'liability_id,balance_date' });
            if (error) throw error;
          }
          result.liabilityBalancesImported = liabilityBalancesToUpsert.length;
        }

        if (valuationsToUpsert.length > 0) {
          for (const batch of chunk(valuationsToUpsert, 500)) {
            const { error } = await supabase
              .from('valuations')
              .upsert(batch, { onConflict: 'user_id,name,valuation_date' });
            if (error) throw error;
          }
          result.valuationsImported = valuationsToUpsert.length;
        }

        if (fxRatesToUpsert.length > 0) {
          const { error } = await supabase
            .from('fx_rates')
            .upsert(fxRatesToUpsert, { onConflict: 'rate_date,from_currency,to_currency' });
          if (error) {
            console.warn('[snapshot-import] fx_rates upsert skipped:', error.message);
          } else {
            result.fxRatesImported = fxRatesToUpsert.length;
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
    },
    [parseCSV, toast]
  );

  return { importSnapshot, isImporting, importResult };
}
