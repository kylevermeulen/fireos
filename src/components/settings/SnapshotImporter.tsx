import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Check, AlertTriangle } from 'lucide-react';
import { useSnapshotImporter } from '@/hooks/useSnapshotImporter';
import { useAccountSeeder } from '@/hooks/useAccountSeeder';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function SnapshotImporter() {
  const { importSnapshot, isImporting, importResult } = useSnapshotImporter();
  const { seedAccounts, isSeeding } = useAccountSeeder();
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      return;
    }
    
    setFileName(file.name);
    const content = await file.text();
    await importSnapshot(content);
  }, [importSnapshot]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  return (
    <div className="space-y-4">
      {/* Seed Accounts Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Step 1: Seed Accounts
          </CardTitle>
          <CardDescription>
            Create your standard accounts and liabilities to match the import mapping
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={seedAccounts} 
            disabled={isSeeding}
            variant="outline"
          >
            {isSeeding ? 'Seeding...' : 'Seed Accounts & Liabilities'}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Creates: Chase, Wealthfront, RWBaird, Vanguard, Coinbase (USA), CommBank, Bank of Melbourne, CommSec, AustralianSuper, CoinJar (AUS), Permata (IDR), plus mortgages and loans.
          </p>
        </CardContent>
      </Card>

      {/* Import CSV Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Step 2: Import Snapshot CSV
          </CardTitle>
          <CardDescription>
            Upload your monthly balance snapshot CSV file (like Historical_Data_-_Budget.csv)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleChange}
              className="hidden"
              id="csv-upload"
              disabled={isImporting}
            />
            <label 
              htmlFor="csv-upload" 
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isImporting 
                  ? 'Importing...' 
                  : fileName 
                    ? `Loaded: ${fileName}` 
                    : 'Drag & drop your CSV here, or click to select'
                }
              </p>
            </label>
          </div>

          {importResult && (
            <div className="mt-4 space-y-3">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Import Complete</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>{importResult.balancesImported} account balance records</li>
                    <li>{importResult.liabilityBalancesImported} liability balance records</li>
                    <li>{importResult.valuationsImported} valuation records</li>
                    <li>{importResult.fxRatesImported} FX rates</li>
                    <li>Across {importResult.monthsImported} months</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {importResult.unmatchedRows.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Unmatched Rows</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      {importResult.unmatchedRows.map((row, i) => (
                        <li key={i}>{row}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
