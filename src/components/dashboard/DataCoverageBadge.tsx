import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/format';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DataCoverageBadgeProps {
  firstDate: string | null;
  lastDate: string | null;
  warnings?: string[];
}

export function DataCoverageBadge({
  firstDate,
  lastDate,
  warnings = [],
}: DataCoverageBadgeProps) {
  if (!firstDate || !lastDate) return null;

  const hasWarnings = warnings.length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 text-xs font-normal">
              <Calendar className="h-3 w-3" />
              Snapshots: {formatDate(firstDate, 'short')} → {formatDate(lastDate, 'short')}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Data available from {formatDate(firstDate, 'medium')} to {formatDate(lastDate, 'medium')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {hasWarnings && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="gap-1 text-xs font-normal">
                <AlertTriangle className="h-3 w-3" />
                {warnings.length} warning{warnings.length > 1 ? 's' : ''}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <ul className="text-sm space-y-1">
                {warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
