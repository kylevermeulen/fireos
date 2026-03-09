import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Check, AlertTriangle, FileSpreadsheet, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBankImporter, autoDetectColumns, BankImportConfig, ImportPreviewRow, ColumnMapping } from '@/hooks/useBankImporter';
import { useCategoryRules } from '@/hooks/useCategoryRules';
import { formatCompactCurrency } from '@/lib/format';

interface Account {
  id: string;
  name: string;
  currency: string;
}

export function BankImporter() {
  const { parseFile, checkDuplicates, importRows, isImporting } = useBankImporter();
  const { rules, applyRules, seedRules, isSeeding, isLoading: rulesLoading } = useCategoryRules();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [dateFormat, setDateFormat] = useState<BankImportConfig['dateFormat']>('dd/mm/yyyy');
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ date: 0, description: 1, amount: 2 });
  const [useSeparateDebitCredit, setUseSeparateDebitCredit] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [step, setStep] = useState<'select' | 'map' | 'preview' | 'done'>('select');

  // Fetch accounts
  useEffect(() => {
    supabase.from('accounts').select('id, name, currency').order('name').then(({ data }) => {
      setAccounts(data ?? []);
    });
  }, []);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.csv')) return;
    setFileName(file.name);
    file.text().then(content => {
      setCsvContent(content);
      // Parse first line for headers
      const firstLine = content.split(/\r?\n/)[0] ?? '';
      const hdrs = firstLine.split(',').map(h => h.replace(/"/g, '').trim());
      setHeaders(hdrs);
      // Auto-detect common column names
      const autoMap: ColumnMapping = { date: 0, description: 1, amount: 2 };
      hdrs.forEach((h, i) => {
        const lc = h.toLowerCase();
        if (lc.includes('date')) autoMap.date = i;
        if (lc.includes('description') || lc.includes('narrative') || lc.includes('details') || lc.includes('memo')) autoMap.description = i;
        if (lc === 'amount' || lc === 'value') autoMap.amount = i;
        if (lc === 'debit') { autoMap.debit = i; setUseSeparateDebitCredit(true); }
        if (lc === 'credit') { autoMap.credit = i; setUseSeparateDebitCredit(true); }
      });
      setColumnMapping(autoMap);
      setStep('map');
    });
  }, []);

  const handlePreview = useCallback(async () => {
    if (!csvContent || !selectedAccountId || !selectedAccount) return;
    
    const config: BankImportConfig = {
      accountId: selectedAccountId,
      accountName: selectedAccount.name,
      currency: selectedAccount.currency,
      fileName: fileName ?? 'unknown.csv',
      columnMapping,
      dateFormat,
      skipRows: 1,
      invertSign: false,
    };

    const parsed = parseFile(csvContent, config, applyRules);
    const withDupes = await checkDuplicates(parsed, selectedAccountId);
    setPreviewRows(withDupes);
    setStep('preview');
  }, [csvContent, selectedAccountId, selectedAccount, columnMapping, dateFormat, fileName, parseFile, applyRules, checkDuplicates]);

  const handleImport = useCallback(async () => {
    if (!selectedAccount) return;

    const config: BankImportConfig = {
      accountId: selectedAccountId,
      accountName: selectedAccount.name,
      currency: selectedAccount.currency,
      fileName: fileName ?? 'unknown.csv',
      columnMapping,
      dateFormat,
      skipRows: 1,
      invertSign: false,
    };

    await importRows(previewRows, config);
    setImportDone(true);
    setStep('done');
  }, [selectedAccountId, selectedAccount, fileName, columnMapping, dateFormat, previewRows, importRows]);

  const reset = () => {
    setCsvContent(null);
    setFileName(null);
    setHeaders([]);
    setPreviewRows([]);
    setImportDone(false);
    setStep('select');
  };

  const newTxCount = previewRows.filter(r => !r.isDuplicate).length;
  const dupeCount = previewRows.filter(r => r.isDuplicate).length;
  const categorizedCount = previewRows.filter(r => r.matchedRule && !r.isDuplicate).length;
  const reviewCount = previewRows.filter(r => r.matchedRule?.needs_review && !r.isDuplicate).length;

  return (
    <div className="space-y-4">
      {/* Category Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Category Rules
          </CardTitle>
          <CardDescription>
            {rulesLoading ? 'Loading...' : `${rules.length} rules loaded`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={seedRules} disabled={isSeeding} variant="outline" size="sm">
            {isSeeding ? 'Seeding...' : rules.length > 0 ? 'Re-seed Default Rules' : 'Seed Category Rules'}
          </Button>
        </CardContent>
      </Card>

      {/* Import Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Bank Transactions
          </CardTitle>
          <CardDescription>
            Upload raw CSV exports from your bank accounts. Duplicates are auto-detected by date + amount.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Account & File selection */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bank Account</label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Format</label>
                  <Select value={dateFormat} onValueChange={v => setDateFormat(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                      <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dd-mm-yyyy">DD-MM-YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="bank-csv-upload"
                  disabled={!selectedAccountId}
                />
                <label
                  htmlFor="bank-csv-upload"
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer flex flex-col items-center gap-2 transition-colors ${
                    selectedAccountId ? 'border-muted-foreground/25 hover:border-primary/50' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {selectedAccountId ? 'Click to select your bank CSV file' : 'Select an account first'}
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'map' && headers.length > 0 && (
            <div className="space-y-4">
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertTitle>{fileName}</AlertTitle>
                <AlertDescription>Map your CSV columns below. Auto-detection has been applied.</AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Column</label>
                  <Select value={String(columnMapping.date)} onValueChange={v => setColumnMapping(m => ({ ...m, date: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Column ${i + 1}`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description Column</label>
                  <Select value={String(columnMapping.description)} onValueChange={v => setColumnMapping(m => ({ ...m, description: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Column ${i + 1}`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {!useSeparateDebitCredit ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount Column</label>
                    <Select value={String(columnMapping.amount)} onValueChange={v => setColumnMapping(m => ({ ...m, amount: parseInt(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Column ${i + 1}`}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Debit Column</label>
                      <Select value={String(columnMapping.debit ?? 0)} onValueChange={v => setColumnMapping(m => ({ ...m, debit: parseInt(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Column ${i + 1}`}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Credit Column</label>
                      <Select value={String(columnMapping.credit ?? 0)} onValueChange={v => setColumnMapping(m => ({ ...m, credit: parseInt(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Column ${i + 1}`}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => setUseSeparateDebitCredit(!useSeparateDebitCredit)}>
                  {useSeparateDebitCredit ? 'Use Single Amount Column' : 'Use Separate Debit/Credit'}
                </Button>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={reset}>Back</Button>
                <Button onClick={handlePreview}>Preview & Check Duplicates</Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{previewRows.length} total rows</Badge>
                <Badge className="bg-green-500/20 text-green-700">{newTxCount} new</Badge>
                <Badge className="bg-yellow-500/20 text-yellow-700">{dupeCount} duplicates</Badge>
                <Badge className="bg-blue-500/20 text-blue-700">{categorizedCount} auto-categorized</Badge>
                {reviewCount > 0 && (
                  <Badge className="bg-orange-500/20 text-orange-700">{reviewCount} needs review</Badge>
                )}
              </div>

              <div className="max-h-[400px] overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.slice(0, 100).map((row, i) => (
                      <TableRow key={i} className={row.isDuplicate ? 'opacity-40' : ''}>
                        <TableCell>
                          {row.isDuplicate ? (
                            <Badge variant="outline" className="text-muted-foreground text-xs">Dupe</Badge>
                          ) : row.matchedRule?.needs_review ? (
                            <Badge variant="outline" className="text-orange-600 text-xs">Review</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 text-xs">New</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{row.date}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{row.description}</TableCell>
                        <TableCell className={`text-right text-xs ${row.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {formatCompactCurrency(Math.abs(row.amount))}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.matchedRule ? (
                            <span className="text-primary">{row.matchedRule.l1_category}</span>
                          ) : (
                            <span className="text-muted-foreground">Uncategorized</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {previewRows.length > 100 && (
                <p className="text-xs text-muted-foreground">Showing first 100 of {previewRows.length} rows</p>
              )}

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep('map')}>Back</Button>
                <Button onClick={handleImport} disabled={isImporting || newTxCount === 0}>
                  {isImporting ? 'Importing...' : `Import ${newTxCount} Transactions`}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="space-y-4">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Import Complete</AlertTitle>
                <AlertDescription>
                  Successfully imported transactions from {fileName} into {selectedAccount?.name}.
                </AlertDescription>
              </Alert>
              <Button onClick={reset}>Import Another File</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
