import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCompactCurrency } from '@/lib/format';
import { DataSanityStats, CashflowMode } from '@/types/cashflow';
import { useState } from 'react';

interface DataSanityPanelProps {
  stats: DataSanityStats;
  mode: CashflowMode;
}

export function DataSanityPanel({ stats, mode }: DataSanityPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-dashed">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Data Sanity Check
              </CardTitle>
              <ChevronDown 
                className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} 
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Mode</p>
                <p className="font-medium capitalize">{mode}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Total Income (AUD)</p>
                <p className="font-medium text-success">{formatCompactCurrency(stats.totalIncome)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Total External Spend (AUD)</p>
                <p className="font-medium">{formatCompactCurrency(stats.totalExternalSpend)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Internal Transfers Excluded (AUD)</p>
                <p className="font-medium text-muted-foreground">{formatCompactCurrency(stats.totalInternalTransfersExcluded)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Row Count</p>
                <p className="font-medium">{stats.rowCount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
