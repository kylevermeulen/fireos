import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback } from 'react';
import { CategoryRule } from './useCategoryRules';
import { mapUpCategory } from '@/lib/upbank-categories';

export interface ColumnMapping {
  date: number;
  description: number;
  amount: number;          // Single amount column (positive/negative)
  debit?: number;          // Separate debit column
  credit?: number;         // Separate credit column
  counterparty?: number;   // Optional counterparty column
  balance?: number;        // Optional running balance (ignored for import)
  category?: number;       // Optional bank-provided category column
  transactionType?: number; // Optional bank transaction type (e.g. Transfer, Purchase)
  direction?: number;      // Direction column (IN/OUT) — determines sign (e.g. Wise)
  feeAmount?: number;      // Fee column to add to the source amount for total
  sourceCurrency?: number; // Source currency column
  signColumn?: number;     // Credit/Debit indicator column (e.g. Permata)
}

export interface BankImportConfig {
  accountId: string;
  accountName: string;
  currency: string;
  fileName: string;
  columnMapping: ColumnMapping;
  dateFormat: 'dd/mm/yyyy' | 'yyyy-mm-dd' | 'mm/dd/yyyy' | 'dd-mm-yyyy' | 'iso' | 'auto';
  skipRows: number;        // Header rows to skip (default 1)
  invertSign: boolean;     // Some banks show expenses as positive
}

export interface ImportPreviewRow {
  date: string;
  description: string;
  amount: number;
  counterparty: string;
  matchedRule: CategoryRule | null;
  bankCategory: string;
  mappedL1: string | null;
  mappedL2: string | null;
  isTransfer: boolean;
  isDuplicate: boolean;
  dupeType: 'none' | 'same-account' | 'cross-account';  // Why it was flagged
  dupeAccountName: string | null;  // Which account has the matching tx
  excluded: boolean;               // User can toggle this
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

  // ISO 8601 datetime (e.g. 2026-03-09T14:21:42+11:00) or space-separated datetime (e.g. 2026-03-08 05:46:57)
  if (format === 'iso' || format === 'auto') {
    const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})[T ]/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  if (format === 'yyyy-mm-dd' || format === 'auto') {
    const m = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }

  if (format === 'dd/mm/yyyy' || format === 'auto') {
    const m = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m && (format === 'dd/mm/yyyy' || parseInt(m[1]) > 12)) {
      return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    if (m && format === 'auto') {
      return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
  }

  if (format === 'mm/dd/yyyy') {
    const m = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }

  if (format === 'dd-mm-yyyy') {
    const m = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }

  return null;
}

function parseAmount(value: string): number | null {
  if (!value) return null;
  let s = value.trim().replace(/\$/g, '').replace(/\s/g, '');
  const neg = s.startsWith('-') || (s.startsWith('(') && s.endsWith(')'));
  s = s.replace(/[()-]/g, '');

  // Detect IDR-style formatting: dots as thousands separators, comma as decimal (or no decimal)
  // e.g. "1.500.000" or "1.500.000,00"
  const dotCount = (s.match(/\./g) || []).length;
  const commaCount = (s.match(/,/g) || []).length;
  if (dotCount > 1 || (dotCount >= 1 && commaCount === 1)) {
    // Dots are thousand separators, comma is decimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // Standard: commas are thousand separators
    s = s.replace(/,/g, '');
  }

  const n = parseFloat(s);
  if (!isFinite(n)) return null;
  return neg ? -Math.abs(n) : n;
}

/**
 * Detect the date format from sample values in the date column.
 */
function detectDateFormat(samples: string[]): BankImportConfig['dateFormat'] {
  for (const s of samples) {
    if (s.match(/^\d{4}-\d{2}-\d{2}T/)) return 'iso';
    if (s.match(/^\d{4}-\d{2}-\d{2}[ ]/)) return 'iso'; // space-separated datetime (Wise)
    if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return 'yyyy-mm-dd';
    if (s.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) return 'dd/mm/yyyy';
    if (s.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) return 'dd-mm-yyyy';
  }
  return 'auto';
}

/**
 * Normalize a header name for flexible matching.
 */
function norm(h: string): string {
  return h.toLowerCase().replace(/[_\s]+/g, ' ').trim();
}

/**
 * Find column index using flexible matching (exact → starts-with → contains).
 */
function findCol(headers: string[], names: string[]): number {
  const nh = headers.map(norm);
  const nn = names.map(n => n.toLowerCase());

  for (const n of nn) {
    const idx = nh.indexOf(n);
    if (idx !== -1) return idx;
  }
  for (const n of nn) {
    const idx = nh.findIndex(h => h.startsWith(n));
    if (idx !== -1) return idx;
  }
  for (const n of nn) {
    const idx = nh.findIndex(h => h.includes(n));
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Scan the first N lines of CSV content to find the actual header row.
 * Some bank CSVs (e.g. Permata) have preamble rows before headers.
 * Returns the header row index (0-based) and parsed headers.
 */
export function findHeaderRow(csvContent: string, maxScan = 5): { headerIndex: number; headers: string[] } {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim());
  const knownHeaderKeywords = [
    'posted date', 'transaction date', 'date', 'settled date', 'created on', 'time',
  ];

  for (let i = 0; i < Math.min(maxScan, lines.length); i++) {
    const cells = parseCsvLine(lines[i]);
    const normalized = cells.map(c => c.toLowerCase().replace(/[_\s]+/g, ' ').trim());
    // Check if this row contains at least one known date-related header AND at least one other known header
    const hasDateHeader = normalized.some(h =>
      knownHeaderKeywords.some(k => h.includes(k))
    );
    const hasOtherHeader = normalized.some(h =>
      h.includes('description') || h.includes('amount') || h.includes('credit') || h.includes('debit') || h.includes('direction') || h.includes('narrative')
    );
    if (hasDateHeader && hasOtherHeader) {
      // Remove BOM from first cell
      if (cells[0]?.startsWith('\uFEFF')) cells[0] = cells[0].slice(1);
      return { headerIndex: i, headers: cells.map(c => c.trim()) };
    }
  }

  // Fallback: first row
  const cells = parseCsvLine(lines[0] ?? '');
  if (cells[0]?.startsWith('\uFEFF')) cells[0] = cells[0].slice(1);
  return { headerIndex: 0, headers: cells.map(c => c.trim()) };
}

/**
 * Auto-detect column mapping from CSV headers.
 */
export function autoDetectColumns(headers: string[]): { mapping: ColumnMapping; hasDebitCredit: boolean; detectedDateFormat: BankImportConfig['dateFormat'] } {
  const mapping: ColumnMapping = { date: 0, description: 1, amount: 2 };
  let hasDebitCredit = false;

  // Detect Wise format by checking for "Direction" and "Created on" columns
  const directionIdx = findCol(headers, ['direction']);
  const createdOnIdx = findCol(headers, ['created on']);
  const sourceAmountIdx = findCol(headers, ['source amount (after fees)', 'source amount']);
  const targetNameIdx = findCol(headers, ['target name']);
  const sourceNameIdx = findCol(headers, ['source name']);
  const sourceFeeIdx = findCol(headers, ['source fee amount']);
  const sourceCurrencyIdx = findCol(headers, ['source currency']);

  const isWiseFormat = directionIdx !== -1 && createdOnIdx !== -1 && sourceAmountIdx !== -1;

  if (isWiseFormat) {
    mapping.date = createdOnIdx;
    mapping.description = targetNameIdx !== -1 ? targetNameIdx : (sourceNameIdx !== -1 ? sourceNameIdx : 1);
    mapping.amount = sourceAmountIdx;
    mapping.direction = directionIdx;
    if (sourceFeeIdx !== -1) mapping.feeAmount = sourceFeeIdx;
    if (sourceCurrencyIdx !== -1) mapping.sourceCurrency = sourceCurrencyIdx;

    // Counterparty: use the "other" party
    if (targetNameIdx !== -1) mapping.counterparty = targetNameIdx;

    // Category
    const catIdx = findCol(headers, ['category']);
    if (catIdx !== -1) mapping.category = catIdx;

    return { mapping, hasDebitCredit: false, detectedDateFormat: 'iso' as BankImportConfig['dateFormat'] };
  }

  // Date: prefer "Posted Date", "Settled Date" (actual settlement), then "Time", then generic "date"
  const postedIdx = findCol(headers, ['posted date']);
  const settledIdx = findCol(headers, ['settled date']);
  const timeIdx = findCol(headers, ['time']);
  const dateIdx = findCol(headers, ['date', 'transaction date', 'trans date']);
  mapping.date = postedIdx !== -1 ? postedIdx : (settledIdx !== -1 ? settledIdx : (timeIdx !== -1 ? timeIdx : (dateIdx !== -1 ? dateIdx : 0)));

  // Description
  const descIdx = findCol(headers, ['description', 'narrative', 'details', 'memo', 'transaction description']);
  if (descIdx !== -1) mapping.description = descIdx;

  // Amount: prefer "Subtotal (AUD)" or "Total (AUD)", then generic
  const subtotalIdx = findCol(headers, ['subtotal (aud)', 'subtotal']);
  const totalIdx = findCol(headers, ['total (aud)', 'total']);
  const amountIdx = findCol(headers, ['amount', 'value']);
  mapping.amount = subtotalIdx !== -1 ? subtotalIdx : (totalIdx !== -1 ? totalIdx : (amountIdx !== -1 ? amountIdx : 2));

  // Debit/Credit
  const debitIdx = findCol(headers, ['debit']);
  const creditIdx = findCol(headers, ['credit']);
  if (debitIdx !== -1 && creditIdx !== -1) {
    mapping.debit = debitIdx;
    mapping.credit = creditIdx;
    hasDebitCredit = true;
  }

  // Credit/Debit sign indicator column (e.g. Permata: "Credit/Debit")
  const signIdx = findCol(headers, ['credit/debit', 'credit debit', 'cr/dr']);
  if (signIdx !== -1) mapping.signColumn = signIdx;

  // Counterparty / Payee
  const payeeIdx = findCol(headers, ['payee', 'counterparty', 'merchant', 'beneficiary']);
  if (payeeIdx !== -1) mapping.counterparty = payeeIdx;

  // Bank-provided category
  const catIdx = findCol(headers, ['category']);
  if (catIdx !== -1) mapping.category = catIdx;

  // Transaction type (Transfer, Purchase, Direct Credit, etc.)
  const typeIdx = findCol(headers, ['transaction type', 'type']);
  if (typeIdx !== -1) mapping.transactionType = typeIdx;

  // Detect Permata-style: has "Posted Date" and "Credit/Debit" columns
  const isPermata = findCol(headers, ['posted date']) !== -1 && signIdx !== -1;
  const detectedDateFormat: BankImportConfig['dateFormat'] = isPermata ? 'mm/dd/yyyy' : 'auto';

  return { mapping, hasDebitCredit, detectedDateFormat };
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

    // Auto-detect date format from first few data rows
    let dateFormat = config.dateFormat;
    if (dateFormat === 'auto') {
      const samples: string[] = [];
      for (let i = config.skipRows; i < Math.min(config.skipRows + 5, lines.length); i++) {
        const cells = parseCsvLine(lines[i]);
        const val = cells[config.columnMapping.date] ?? '';
        if (val) samples.push(val.trim());
      }
      dateFormat = detectDateFormat(samples);
    }

    for (let i = config.skipRows; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]);
      const dateStr = cells[config.columnMapping.date] ?? '';
      const description = cells[config.columnMapping.description] ?? '';
      const counterparty = config.columnMapping.counterparty != null
        ? (cells[config.columnMapping.counterparty] ?? '')
        : '';

      // Bank-provided category (e.g. Up Bank "Category" column)
      const bankCategory = config.columnMapping.category != null
        ? (cells[config.columnMapping.category] ?? '')
        : '';

      // Bank transaction type (e.g. "Transfer", "Purchase")
      const bankTxType = config.columnMapping.transactionType != null
        ? (cells[config.columnMapping.transactionType] ?? '')
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

      // If direction column exists (Wise format), use it to determine sign
      if (config.columnMapping.direction != null && amount != null) {
        const direction = (cells[config.columnMapping.direction] ?? '').toUpperCase().trim();
        // Add fee back to get full source amount
        if (config.columnMapping.feeAmount != null) {
          const fee = parseAmount(cells[config.columnMapping.feeAmount] ?? '');
          if (fee != null) amount = amount + Math.abs(fee);
        }
        amount = Math.abs(amount);
        if (direction === 'OUT') amount = -amount;
        // NEUTRAL direction (e.g. currency conversion) — treat as outflow
        if (direction === 'NEUTRAL') amount = -amount;
      }

      // If sign column exists (Permata format: "Credit/Debit"), use it to determine sign
      if (config.columnMapping.signColumn != null && amount != null) {
        const sign = (cells[config.columnMapping.signColumn] ?? '').toUpperCase().trim();
        amount = Math.abs(amount);
        if (sign === 'DEBIT' || sign === 'DB' || sign === 'D') amount = -amount;
      }

      if (config.invertSign && amount != null) amount = -amount;

      const parsedDate = parseDate(dateStr, dateFormat);
      if (!parsedDate || amount == null) continue;

      // Detect internal transfers from bank tx type
      const isTransfer = bankTxType.toLowerCase() === 'transfer';

      // Try our category rules first
      const searchText = `${counterparty} ${description}`;
      const matchedRule = applyRules(searchText);

      // Map bank category to our L1/L2
      const bankMapping = mapUpCategory(bankCategory);

      rows.push({
        date: parsedDate,
        description: counterparty || description,
        amount,
        counterparty,
        matchedRule,
        bankCategory,
        mappedL1: bankMapping?.l1 ?? null,
        mappedL2: bankMapping?.l2 ?? null,
        isTransfer,
        isDuplicate: false,
        dupeType: 'none',
        dupeAccountName: null,
        excluded: false,
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

    const dates = rows.map(r => r.date).sort();
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    // Check same-account duplicates (likely real dupes from re-importing)
    const { data: sameAcct } = await supabase
      .from('transactions')
      .select('transaction_date, amount_native, description')
      .eq('account_id', accountId)
      .gte('transaction_date', minDate)
      .lte('transaction_date', maxDate);

    // Check cross-account matches (likely other side of transfers)
    const { data: crossAcct } = await supabase
      .from('transactions')
      .select('transaction_date, amount_native, source_account_name')
      .neq('account_id', accountId)
      .gte('transaction_date', minDate)
      .lte('transaction_date', maxDate);

    // Build same-account dedup keys (date + amount + description prefix)
    const sameKeys = new Map<string, number>();
    for (const t of (sameAcct ?? [])) {
      const descPrefix = (t.description ?? '').substring(0, 20).toLowerCase();
      const key = `${t.transaction_date}|${Number(t.amount_native).toFixed(2)}|${descPrefix}`;
      sameKeys.set(key, (sameKeys.get(key) ?? 0) + 1);
    }

    // Build cross-account keys (date + matching opposite amount)
    const crossKeys = new Map<string, string>(); // key → account name
    for (const t of (crossAcct ?? [])) {
      // Match on same date, opposite sign amount (transfer in one = transfer out in other)
      const key = `${t.transaction_date}|${Number(t.amount_native).toFixed(2)}`;
      crossKeys.set(key, t.source_account_name ?? 'Other account');
    }

    const usedSame = new Map<string, number>();

    return rows.map(row => {
      const descPrefix = row.description.substring(0, 20).toLowerCase();
      const sameKey = `${row.date}|${row.amount.toFixed(2)}|${descPrefix}`;
      const crossKey = `${row.date}|${row.amount.toFixed(2)}`;

      const sameCount = sameKeys.get(sameKey) ?? 0;
      const used = usedSame.get(sameKey) ?? 0;

      if (used < sameCount) {
        usedSame.set(sameKey, used + 1);
        return {
          ...row,
          isDuplicate: true,
          dupeType: 'same-account' as const,
          dupeAccountName: null,
          excluded: true, // Default exclude same-account dupes
        };
      }

      // Check cross-account match (flag but DON'T exclude — these are likely valid)
      if (crossKeys.has(crossKey)) {
        return {
          ...row,
          isDuplicate: true,
          dupeType: 'cross-account' as const,
          dupeAccountName: crossKeys.get(crossKey) ?? null,
          excluded: false, // Keep by default — it's the other side of a transfer
        };
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

      const toImport = rows.filter(r => !r.excluded);
      result.duplicates = rows.filter(r => r.excluded).length;

      if (toImport.length === 0) {
        toast({ title: 'No transactions to import', description: `${result.duplicates} excluded` });
        return result;
      }

      const dates = toImport.map(r => r.date).sort();

      const { data: importLog, error: logError } = await supabase
        .from('bank_import_logs')
        .insert({
          user_id: user.id,
          account_id: config.accountId,
          file_name: config.fileName,
          rows_total: rows.length,
          rows_duplicates: result.duplicates,
          rows_imported: toImport.length,
          date_from: dates[0],
          date_to: dates[dates.length - 1],
        })
        .select('id')
        .single();
      if (logError) throw logError;

      const txRecords = toImport.map(row => {
        const isIncome = row.amount > 0;
        const rule = row.matchedRule;

        // Category priority: rule match > bank category mapping > fallback
        const l1 = rule?.l1_category ?? row.mappedL1 ?? (isIncome ? 'Income' : 'Unknown');
        const l2 = rule?.l2_category ?? row.mappedL2 ?? null;

        // Transfer detection: rule says transfer, OR bank tx type is "Transfer"
        const isTransfer = rule?.is_internal_transfer ?? row.isTransfer;

        // Needs review if rule says so, or if no categorization at all
        const needsReview = rule?.needs_review ?? (!rule && !row.mappedL1);

        return {
          user_id: user.id,
          account_id: config.accountId,
          transaction_date: row.date,
          amount_native: row.amount,
          amount_aud: row.amount,
          currency: config.currency as 'AUD' | 'USD' | 'IDR',
          transaction_type: (isTransfer ? 'transfer' : isIncome ? 'income' : 'expense') as any,
          description: row.description,
          merchant: row.counterparty || null,
          counterparty: row.counterparty || null,
          l1_category: l1,
          l2_category: l2,
          is_internal_transfer: isTransfer,
          needs_review: needsReview,
          source_account_name: config.accountName,
          source_import_id: importLog.id,
        };
      });

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
