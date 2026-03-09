import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback } from 'react';
import { CategoryRule } from './useCategoryRules';

export interface ColumnMapping {
  date: number;
  description: number;
  amount: number;          // Single amount column (positive/negative)
  debit?: number;          // Separate debit column
  credit?: number;         // Separate credit column
  counterparty?: number;   // Optional counterparty column
  balance?: number;        // Optional running balance (ignored for import)
}

export interface BankImportConfig {
  accountId: string;
  accountName: string;
  currency: string;
  fileName: string;
  columnMapping: ColumnMapping;
  dateFormat: 'dd/mm/yyyy' | 'yyyy-mm-dd' | 'mm/dd/yyyy' | 'dd-mm-yyyy';
  skipRows: number;        // Header rows to skip (default 1)
  invertSign: boolean;     // Some banks show expenses as positive
}

export interface ImportPreviewRow {
  date: string;
  description: string;
  amount: number;
  counterparty: string;
  matchedRule: CategoryRule | null;
  isDuplicate: boolean;
  rawLine: string;
}

export interface BankImportResult {
  imported: number;
  duplicates: number;
  total: number;
  errors: string[];
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parseDate(dateStr: string, format: BankImportConfig['dateFormat']): string | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();

  if (format === 'yyyy-mm-dd') {
    const m = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  } else if (format === 'dd/mm/yyyy') {
    const m = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  } else if (format === 'mm/dd/yyyy') {
    const m = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  } else if (format === 'dd-mm-yyyy') {
    const m = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

function parseAmount(value: string): number | null {
  if (!value) return null;
  let s = value.trim().replace(/\$/g, '').replace(/\s/g, '');
  const neg = s.startsWith('-') || (s.startsWith('(') && s.endsWith(')'));
  s = s.replace(/[()-]/g, '').replace(/,/g, '');
  const n = parseFloat(s);
  if (!isFinite(n)) return null;
  return neg ? -Math.abs(n) : n;
}

export function useBankImporter() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);

  const parseFile = useCallback((
    csvContent: string,
    config: BankImportConfig,
    applyRules: (desc: string) => CategoryRule | null,
  ): ImportPreviewRow[] => {
    const lines = csvContent.split(/\r?\n/).filter(l => l.trim());
    const rows: ImportPreviewRow[] = [];

    for (let i = config.skipRows; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]);
      const dateStr = cells[config.columnMapping.date] ?? '';
      const description = cells[config.columnMapping.description] ?? '';
      const counterparty = config.columnMapping.counterparty != null
        ? (cells[config.columnMapping.counterparty] ?? '')
        : '';

      let amount: number | null = null;
      if (config.columnMapping.debit != null && config.columnMapping.credit != null) {
        const debit = parseAmount(cells[config.columnMapping.debit] ?? '');
        const credit = parseAmount(cells[config.columnMapping.credit] ?? '');
        if (credit != null && credit !== 0) amount = Math.abs(credit);
        else if (debit != null) amount = -Math.abs(debit);
      } else {
        amount = parseAmount(cells[config.columnMapping.amount] ?? '');
      }

      if (config.invertSign && amount != null) amount = -amount;

      const parsedDate = parseDate(dateStr, config.dateFormat);
      if (!parsedDate || amount == null) continue;

      const searchText = `${description} ${counterparty}`;
      const matchedRule = applyRules(searchText);

      rows.push({
        date: parsedDate,
        description,
        amount,
        counterparty,
        matchedRule,
        isDuplicate: false,
        rawLine: lines[i],
      });
    }

    return rows;
  }, []);

  const checkDuplicates = useCallback(async (
    rows: ImportPreviewRow[],
    accountId: string,
  ): Promise<ImportPreviewRow[]> => {
    if (rows.length === 0) return rows;

    // Get date range
    const dates = rows.map(r => r.date).sort();
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    // Fetch existing transactions in this date range for this account
    const { data: existing } = await supabase
      .from('transactions')
      .select('transaction_date, amount_native')
      .eq('account_id', accountId)
      .gte('transaction_date', minDate)
      .lte('transaction_date', maxDate);

    if (!existing || existing.length === 0) return rows;

    // Build a set of date+amount keys for dedup
    const existingKeys = new Set(
      existing.map(t => `${t.transaction_date}|${Number(t.amount_native).toFixed(2)}`)
    );

    // Count occurrences of each key in existing to handle multiple same-day same-amount
    const existingCounts = new Map<string, number>();
    for (const t of existing) {
      const key = `${t.transaction_date}|${Number(t.amount_native).toFixed(2)}`;
      existingCounts.set(key, (existingCounts.get(key) ?? 0) + 1);
    }

    // Track how many times we've "used" each key in the new rows
    const usedCounts = new Map<string, number>();

    return rows.map(row => {
      const key = `${row.date}|${row.amount.toFixed(2)}`;
      const existCount = existingCounts.get(key) ?? 0;
      const used = usedCounts.get(key) ?? 0;

      if (used < existCount) {
        usedCounts.set(key, used + 1);
        return { ...row, isDuplicate: true };
      }
      return row;
    });
  }, []);

  const importRows = useCallback(async (
    rows: ImportPreviewRow[],
    config: BankImportConfig,
  ): Promise<BankImportResult> => {
    setIsImporting(true);
    const result: BankImportResult = { imported: 0, duplicates: 0, total: rows.length, errors: [] };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      const nonDuplicates = rows.filter(r => !r.isDuplicate);
      result.duplicates = rows.length - nonDuplicates.length;

      if (nonDuplicates.length === 0) {
        toast({ title: 'No new transactions', description: `${result.duplicates} duplicates skipped` });
        return result;
      }

      // Get date range for the log
      const dates = nonDuplicates.map(r => r.date).sort();

      // Create import log
      const { data: importLog, error: logError } = await supabase
        .from('bank_import_logs')
        .insert({
          user_id: user.id,
          account_id: config.accountId,
          file_name: config.fileName,
          rows_total: rows.length,
          rows_duplicates: result.duplicates,
          rows_imported: nonDuplicates.length,
          date_from: dates[0],
          date_to: dates[dates.length - 1],
        })
        .select('id')
        .single();
      if (logError) throw logError;

      // Build transaction records
      const txRecords = nonDuplicates.map(row => {
        const isIncome = row.amount > 0;
        const rule = row.matchedRule;

        return {
          user_id: user.id,
          account_id: config.accountId,
          transaction_date: row.date,
          amount_native: row.amount,
          amount_aud: row.amount, // Same for AUD accounts; FX conversion needed for others
          currency: config.currency as 'AUD' | 'USD' | 'IDR',
          transaction_type: (rule?.is_internal_transfer ? 'transfer' : isIncome ? 'income' : 'expense') as any,
          description: row.description,
          merchant: row.counterparty || null,
          counterparty: row.counterparty || null,
          l1_category: rule?.l1_category ?? (isIncome ? 'Income' : 'Unknown'),
          l2_category: rule?.l2_category ?? null,
          is_internal_transfer: rule?.is_internal_transfer ?? false,
          needs_review: rule?.needs_review ?? false,
          source_account_name: config.accountName,
          source_import_id: importLog.id,
        };
      });

      // Batch insert in chunks of 500
      for (let i = 0; i < txRecords.length; i += 500) {
        const batch = txRecords.slice(i, i + 500);
        const { error } = await supabase.from('transactions').insert(batch);
        if (error) {
          result.errors.push(`Batch ${Math.floor(i / 500) + 1}: ${error.message}`);
        } else {
          result.imported += batch.length;
        }
      }

      toast({
        title: 'Import complete',
        description: `${result.imported} transactions imported, ${result.duplicates} duplicates skipped`,
      });

      return result;
    } catch (err) {
      console.error('Bank import error:', err);
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsImporting(false);
    }
  }, [toast]);

  return { parseFile, checkDuplicates, importRows, isImporting };
}
