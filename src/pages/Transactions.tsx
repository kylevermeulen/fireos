import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload, Search, ArrowUp, ArrowDown, ArrowUpDown, Download, Check, FileSpreadsheet, Tag, X, AlertTriangle, Trash2,
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useBankImporter, BankImportConfig, ImportPreviewRow, ColumnMapping, autoDetectColumns, findHeaderRow } from '@/hooks/useBankImporter';
import { useCategoryRules } from '@/hooks/useCategoryRules';
import { CategoryRulesPanel } from '@/components/transactions/CategoryRulesPanel';
import { L1_DISPLAY_ORDER } from '@/components/transactions/InlineCategoryEditor';
import { CategoryBadge } from '@/components/transactions/CategoryBadge';
import { TransferLinkBadge, buildTransferLinks } from '@/components/transactions/TransferLinkBadge';
import { formatCompactCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
  currency: string;
}

interface DbTransaction {
  id: string;
  transaction_date: string;
  description: string | null;
  merchant: string | null;
  counterparty: string | null;
  amount_native: number;
  amount_aud: number;
  currency: string;
  l1_category: string | null;
  l2_category: string | null;
  is_internal_transfer: boolean;
  needs_review: boolean;
  source_account_name: string | null;
  transaction_type: string;
}

type SortField = 'date' | 'account' | 'description' | 'amount' | 'l1' | 'l2';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 250;

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function Transactions() {
  // ── Data state ──
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // ── Filter / sort state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [l1Filter, setL1Filter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortState, setSortState] = useState<{ field: SortField; dir: SortDir }>({ field: 'date', dir: 'desc' });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ── Import state ──
  const { parseFile, checkDuplicates, importRows, isImporting } = useBankImporter();
  const { rules, applyRules, seedRules, isSeeding, isLoading: rulesLoading } = useCategoryRules();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [dateFormat, setDateFormat] = useState<BankImportConfig['dateFormat']>('auto');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ date: 0, description: 1, amount: 2 });
  const [useSeparateDebitCredit, setUseSeparateDebitCredit] = useState(false);
  const [importStep, setImportStep] = useState<'idle' | 'map' | 'preview' | 'done'>('idle');
  const [dragActive, setDragActive] = useState(false);
  const [invertSign, setInvertSign] = useState(false);
  const [headerIndex, setHeaderIndex] = useState(0);
  const [deleteAccountId, setDeleteAccountId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // ── Load data ──
  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    const PAGE_SIZE = 1000;
    let allData: DbTransaction[] = [];
    let from = 0;
    let keepGoing = true;
    while (keepGoing) {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, transaction_date, description, merchant, counterparty, amount_native, amount_aud, currency, l1_category, l2_category, is_internal_transfer, needs_review, source_account_name, transaction_type')
        .order('transaction_date', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error || !data || data.length === 0) {
        keepGoing = false;
      } else {
        allData = allData.concat(data as DbTransaction[]);
        from += PAGE_SIZE;
        if (data.length < PAGE_SIZE) keepGoing = false;
      }
    }
    setTransactions(allData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadTransactions();
    supabase.from('accounts').select('id, name, currency').order('name').then(({ data }) => setAccounts(data ?? []));
  }, [loadTransactions]);

  const handleDeleteByAccount = useCallback(async () => {
    if (!deleteAccountId) return;
    setIsDeleting(true);
    const { error } = await supabase
      .from('transactions')
      .delete({ count: 'exact' })
      .eq('account_id', deleteAccountId);
    setIsDeleting(false);
    if (error) {
      console.error('Delete error:', error);
    } else {
      loadTransactions();
    }
    setDeleteAccountId('');
  }, [deleteAccountId, loadTransactions]);


  // ── Derived data ──
  const allL1Categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => { if (t.l1_category) set.add(t.l1_category); });
    return Array.from(set).sort((a, b) => {
      const ai = L1_DISPLAY_ORDER.indexOf(a);
      const bi = L1_DISPLAY_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [transactions]);

  const transferLinks = useMemo(() => buildTransferLinks(transactions), [transactions]);

  const handleCategoryUpdated = useCallback((txId: string, newL1: string, isTransfer: boolean) => {
    setTransactions(prev => prev.map(t => 
      t.id === txId 
        ? { ...t, l1_category: newL1, l2_category: null, is_internal_transfer: isTransfer }
        : t
    ));
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (accountFilter !== 'all' && t.source_account_name !== accountFilter) return false;
      if (l1Filter !== 'all' && t.l1_category !== l1Filter) return false;
      if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = (t.description ?? '').toLowerCase().includes(q)
          || (t.counterparty ?? '').toLowerCase().includes(q)
          || (t.merchant ?? '').toLowerCase().includes(q)
          || (t.l1_category ?? '').toLowerCase().includes(q)
          || (t.l2_category ?? '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [transactions, accountFilter, l1Filter, typeFilter, searchQuery]);

  const sorted = useMemo(() => {
    const mult = sortState.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortState.field) {
        case 'date': return mult * a.transaction_date.localeCompare(b.transaction_date);
        case 'account': return mult * (a.source_account_name ?? '').localeCompare(b.source_account_name ?? '');
        case 'description': return mult * (a.description ?? '').localeCompare(b.description ?? '');
        case 'amount': return mult * (a.amount_aud - b.amount_aud);
        case 'l1': return mult * (a.l1_category ?? '').localeCompare(b.l1_category ?? '');
        case 'l2': return mult * (a.l2_category ?? '').localeCompare(b.l2_category ?? '');
        default: return 0;
      }
    });
  }, [filtered, sortState]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  const handleSort = (field: SortField) => {
    setSortState(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  // ── Export ──
  const handleExport = () => {
    const hdrs = ['Date', 'Account', 'Counterparty', 'Description', 'Amount (Native)', 'Currency', 'Amount (AUD)', 'Type', 'Internal Transfer', 'L1', 'L2', 'Needs Review'];
    const rows = sorted.map(t => [
      t.transaction_date,
      escapeCsvField(t.source_account_name ?? ''),
      escapeCsvField(t.counterparty ?? ''),
      escapeCsvField(t.description ?? ''),
      t.amount_native.toString(),
      t.currency,
      t.amount_aud.toString(),
      t.transaction_type,
      t.is_internal_transfer ? 'true' : 'false',
      escapeCsvField(t.l1_category ?? ''),
      escapeCsvField(t.l2_category ?? ''),
      t.needs_review ? 'true' : 'false',
    ].join(','));
    const csv = [hdrs.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Drag & drop / file handling ──
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const processFiles = useCallback((files: FileList | File[]) => {
    const csvFiles = Array.from(files).filter(f => f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    if (csvFiles.length === 0) return;
    setPendingFiles(csvFiles);
    // Load the first file for mapping
    const first = csvFiles[0];
    setCurrentFileName(first.name);
    // Auto-detect credit card by filename or account name
    const fnLower = first.name.toLowerCase();
    const acctLower = (selectedAccount?.name ?? '').toLowerCase();
    // Auto-invert sign for credit cards and loan accounts
    if (fnLower.includes('amex') || fnLower.includes('americanexpress') || acctLower.includes('american express') || acctLower.includes('amex')
        || acctLower.includes('fixed loan') || acctLower.includes('variable loan') || acctLower.includes('mortgage')) {
      setInvertSign(true);
    }
    first.text().then(content => {
      setCsvContent(content);
      const { headerIndex: hIdx, headers: hdrs } = findHeaderRow(content);
      setHeaderIndex(hIdx);

      setHeaders(hdrs);

      // Use smart auto-detection
      const { mapping, hasDebitCredit, detectedDateFormat } = autoDetectColumns(hdrs);
      setUseSeparateDebitCredit(hasDebitCredit);
      setColumnMapping(mapping);
      if (detectedDateFormat !== 'auto') setDateFormat(detectedDateFormat);
      setImportStep('map');
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  }, [processFiles]);

  // ── Preview ──
  const handlePreview = useCallback(async () => {
    if (!csvContent || !selectedAccountId || !selectedAccount) return;
    const config: BankImportConfig = {
      accountId: selectedAccountId,
      accountName: selectedAccount.name,
      currency: selectedAccount.currency,
      fileName: currentFileName ?? 'unknown.csv',
      columnMapping,
      dateFormat,
      skipRows: headerIndex + 1,
      invertSign,
    };
    const parsed = parseFile(csvContent, config, (text) => applyRules(text, rules));
    const withDupes = await checkDuplicates(parsed, selectedAccountId);
    setPreviewRows(withDupes);
    setImportStep('preview');
  }, [csvContent, selectedAccountId, selectedAccount, columnMapping, dateFormat, currentFileName, parseFile, applyRules, rules, checkDuplicates]);

  // ── Import ──
  const handleImport = useCallback(async () => {
    if (!selectedAccount) return;

    const config: BankImportConfig = {
      accountId: selectedAccountId,
      accountName: selectedAccount.name,
      currency: selectedAccount.currency,
      fileName: currentFileName ?? 'unknown.csv',
      columnMapping,
      dateFormat,
      skipRows: headerIndex + 1,
      invertSign,
    };

    await importRows(previewRows, config);

    // Process remaining files with same mapping
    for (let i = 1; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      const content = await file.text();
      const parsed = parseFile(content, { ...config, fileName: file.name }, (text) => applyRules(text, rules));
      const withDupes = await checkDuplicates(parsed, selectedAccountId);
      await importRows(withDupes, { ...config, fileName: file.name });
    }

    setImportStep('done');
    await loadTransactions();
  }, [selectedAccountId, selectedAccount, currentFileName, columnMapping, dateFormat, previewRows, importRows, pendingFiles, parseFile, applyRules, rules, checkDuplicates, loadTransactions]);

  const resetImport = () => {
    setPendingFiles([]);
    setCsvContent(null);
    setCurrentFileName(null);
    setHeaders([]);
    setPreviewRows([]);
    setImportStep('idle');
    setInvertSign(false);
  };

  const includedCount = previewRows.filter(r => !r.excluded).length;
  const excludedCount = previewRows.filter(r => r.excluded).length;
  const sameAcctDupes = previewRows.filter(r => r.dupeType === 'same-account').length;
  const crossAcctDupes = previewRows.filter(r => r.dupeType === 'cross-account').length;

  const toggleRowExcluded = (index: number) => {
    setPreviewRows(prev => prev.map((r, i) => i === index ? { ...r, excluded: !r.excluded } : r));
  };

  // ── Sortable header ──
  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => {
    const isActive = sortState.field === field;
    return (
      <TableHead
        className={cn('sticky top-0 bg-background cursor-pointer hover:bg-muted/50 select-none', className)}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive ? (sortState.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
        </div>
      </TableHead>
    );
  };

  // ── Unique account names for filter ──
  const accountNames = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => { if (t.source_account_name) set.add(t.source_account_name); });
    return Array.from(set).sort();
  }, [transactions]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">Import, categorize, and review bank transactions</p>
          </div>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete by Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Transactions by Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete ALL transactions for the selected account. Use this to clear bad imports before re-uploading.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Select value={deleteAccountId} onValueChange={setDeleteAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account to clear" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => {
                      const count = transactions.filter(t => t.source_account_name === a.name).length;
                      return <SelectItem key={a.id} value={a.id}>{a.name} ({count} txns)</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteByAccount} disabled={!deleteAccountId || isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isDeleting ? 'Deleting...' : 'Delete All'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={sorted.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* ── Category Rules Panel ── */}
        <CategoryRulesPanel />

        {/* ── Import Zone ── */}
        {importStep === 'idle' && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 mb-4">
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={dateFormat} onValueChange={v => setDateFormat(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value="iso">ISO 8601 (Up Bank)</SelectItem>
                    <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                    <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dd-mm-yyyy">DD-MM-YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                  dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
                  !selectedAccountId && 'opacity-50 pointer-events-none',
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  id="tx-file-upload"
                  disabled={!selectedAccountId}
                />
                <label htmlFor="tx-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop CSV files here, or click to select</p>
                  <p className="text-xs text-muted-foreground">Supports multiple files at once (e.g. monthly Permata exports)</p>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Column Mapping ── */}
        {importStep === 'map' && headers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Map Columns — {currentFileName}
                {pendingFiles.length > 1 && (
                  <Badge variant="secondary">+{pendingFiles.length - 1} more files</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Date</label>
                  <Select value={String(columnMapping.date)} onValueChange={v => setColumnMapping(m => ({ ...m, date: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Col ${i + 1}`}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Description</label>
                  <Select value={String(columnMapping.description)} onValueChange={v => setColumnMapping(m => ({ ...m, description: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Col ${i + 1}`}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {!useSeparateDebitCredit ? (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Amount</label>
                    <Select value={String(columnMapping.amount)} onValueChange={v => setColumnMapping(m => ({ ...m, amount: parseInt(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Col ${i + 1}`}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Debit</label>
                      <Select value={String(columnMapping.debit ?? 0)} onValueChange={v => setColumnMapping(m => ({ ...m, debit: parseInt(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Col ${i + 1}`}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Credit</label>
                      <Select value={String(columnMapping.credit ?? 0)} onValueChange={v => setColumnMapping(m => ({ ...m, credit: parseInt(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Col ${i + 1}`}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setUseSeparateDebitCredit(!useSeparateDebitCredit)}>
                  {useSeparateDebitCredit ? 'Use Single Amount' : 'Use Debit/Credit'}
                </Button>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={invertSign} onChange={e => setInvertSign(e.target.checked)} />
                  Invert sign <span className="text-muted-foreground text-xs">(credit cards: charges are positive)</span>
                </label>
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={resetImport}>Cancel</Button>
                <Button onClick={handlePreview} disabled={!selectedAccountId}>Preview & Check Duplicates</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Preview ── */}
        {importStep === 'preview' && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Preview — {currentFileName}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{previewRows.length} total</Badge>
                  <Badge className="bg-green-500/10 text-green-700 border-green-500/20">{includedCount} to import</Badge>
                  {sameAcctDupes > 0 && (
                    <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">{sameAcctDupes} same-acct dupes</Badge>
                  )}
                  {crossAcctDupes > 0 && (
                    <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">{crossAcctDupes} cross-acct matches</Badge>
                  )}
                  {excludedCount > 0 && (
                    <Badge variant="outline" className="text-muted-foreground">{excludedCount} excluded</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {crossAcctDupes > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {crossAcctDupes} transaction(s) match existing records in other accounts (likely the other side of transfers). These are <strong>included</strong> by default — click to exclude if they're true duplicates.
                  </AlertDescription>
                </Alert>
              )}
              <div className="max-h-[400px] overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="w-16">Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.slice(0, 150).map((row, i) => {
                      const catSource = row.matchedRule ? 'rule' : row.mappedL1 ? 'bank' : null;
                      const displayL1 = row.matchedRule?.l1_category ?? row.mappedL1 ?? null;
                      const displayL2 = row.matchedRule?.l2_category ?? row.mappedL2 ?? null;
                      return (
                        <TableRow
                          key={i}
                          className={cn(
                            row.excluded && 'opacity-40',
                            row.dupeType === 'cross-account' && !row.excluded && 'bg-blue-500/5',
                          )}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={!row.excluded}
                              onChange={() => toggleRowExcluded(i)}
                              className="cursor-pointer"
                            />
                          </TableCell>
                          <TableCell>
                            {row.dupeType === 'same-account' ? (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-500/30 text-xs">Dupe</Badge>
                            ) : row.dupeType === 'cross-account' ? (
                              <Badge variant="outline" className="text-blue-600 border-blue-500/30 text-xs" title={`Also in: ${row.dupeAccountName}`}>
                                X-Acct
                              </Badge>
                            ) : row.isTransfer ? (
                              <Badge variant="outline" className="border-blue-500/30 text-blue-600 text-xs">Transfer</Badge>
                            ) : row.matchedRule?.needs_review ? (
                              <Badge variant="outline" className="border-orange-500/30 text-orange-600 text-xs">Review</Badge>
                            ) : (
                              <Badge variant="outline" className="border-green-500/30 text-green-600 text-xs">New</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{row.date}</TableCell>
                          <TableCell className="text-xs max-w-[250px] truncate">
                            {row.description}
                            {row.dupeType === 'cross-account' && row.dupeAccountName && (
                              <span className="text-[10px] text-blue-500 ml-1">({row.dupeAccountName})</span>
                            )}
                          </TableCell>
                          <TableCell className={cn('text-right text-xs', row.amount >= 0 ? 'text-green-600' : 'text-destructive')}>
                            {formatCompactCurrency(Math.abs(row.amount))}
                          </TableCell>
                          <TableCell className="text-xs">
                            {displayL1 ? (
                              <span className={catSource === 'rule' ? 'text-primary' : 'text-muted-foreground'}>
                                {displayL1}{displayL2 ? ` › ${displayL2}` : ''}
                                {catSource === 'bank' && <span className="text-[10px] ml-1 opacity-60">(bank)</span>}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {previewRows.length > 150 && <p className="text-xs text-muted-foreground">Showing first 150 of {previewRows.length}</p>}
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setImportStep('map')}>Back</Button>
                <Button onClick={handleImport} disabled={isImporting || includedCount === 0}>
                  {isImporting ? 'Importing...' : `Import ${includedCount} Transactions`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Done ── */}
        {importStep === 'done' && (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertTitle>Import Complete</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Transactions from {pendingFiles.length} file(s) imported into {selectedAccount?.name}.</span>
              <Button variant="outline" size="sm" onClick={resetImport}>Import More</Button>
            </AlertDescription>
          </Alert>
        )}

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description, counterparty, category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Account" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accountNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={l1Filter} onValueChange={setL1Filter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {allL1Categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
          {(searchQuery || accountFilter !== 'all' || l1Filter !== 'all' || typeFilter !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setAccountFilter('all'); setL1Filter('all'); setTypeFilter('all'); }}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* ── Transaction Table ── */}
        <Card>
          <CardContent className="pt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading transactions...</p>
            ) : sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {transactions.length === 0 ? 'No transactions yet — import a bank CSV above to get started.' : 'No transactions match your filters.'}
              </p>
            ) : (
              <>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableHeader field="date">Date</SortableHeader>
                        <SortableHeader field="account">Account</SortableHeader>
                        <SortableHeader field="description">Description</SortableHeader>
                        <SortableHeader field="amount" className="text-right">Amount</SortableHeader>
                        <SortableHeader field="l1">Category</SortableHeader>
                        <TableHead className="sticky top-0 bg-background w-16">Flags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map(t => (
                        <TableRow key={t.id} className={t.needs_review ? 'bg-orange-500/5' : ''}>
                          <TableCell className="text-xs whitespace-nowrap">{format(new Date(t.transaction_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="text-xs">{t.source_account_name ?? '—'}</TableCell>
                          <TableCell className="text-xs max-w-[250px] truncate" title={t.description ?? ''}>
                            {t.description ?? t.merchant ?? '—'}
                          </TableCell>
                          <TableCell className={cn('text-xs text-right font-medium', t.amount_aud >= 0 ? 'text-green-600' : 'text-destructive')}>
                            {t.amount_aud >= 0 ? '+' : ''}{formatCompactCurrency(Math.abs(t.amount_aud))}
                          </TableCell>
                          <TableCell className="text-xs">
                            <CategoryBadge
                              transactionId={t.id}
                              currentL1={t.l1_category}
                              currentL2={t.l2_category}
                              onOptimisticUpdate={handleCategoryUpdated}
                              onUpdate={loadTransactions}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {t.needs_review && <Badge variant="outline" className="border-orange-500/30 text-orange-600 text-xs">Review</Badge>}
                              {t.is_internal_transfer && <Badge variant="outline" className="text-muted-foreground text-xs">Transfer</Badge>}
                              <TransferLinkBadge
                                transaction={t}
                                linkedAccount={transferLinks.get(t.id) ?? null}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                <div className="flex items-center justify-between pt-3 border-t mt-3">
                  <p className="text-xs text-muted-foreground">
                    Showing {visible.length} of {sorted.length} transactions
                    {sorted.length !== transactions.length && ` (${transactions.length} total)`}
                  </p>
                  {hasMore && (
                    <Button variant="outline" size="sm" onClick={() => setVisibleCount(p => Math.min(p + PAGE_SIZE, sorted.length))}>
                      Show more (+{Math.min(PAGE_SIZE, sorted.length - visibleCount)})
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
