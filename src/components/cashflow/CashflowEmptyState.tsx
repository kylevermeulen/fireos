import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface CashflowEmptyStateProps {
  onUpload?: () => void;
}

export function CashflowEmptyState({ onUpload }: CashflowEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Cashflow Data</h3>
        <p className="text-muted-foreground text-sm text-center mb-6 max-w-md">
          Upload a transaction CSV file to visualize your income and spending patterns.
        </p>
        {onUpload && (
          <Button onClick={onUpload} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
