import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatDate } from '@/lib/format';

interface EnhancedStatCardProps {
  title: string;
  value: string;
  asOfDate?: string;
  includes?: string;
  subtitle?: string;
  change?: {
    value: string;
    isPositive: boolean | null;
  };
  momDelta?: {
    value: string;
    isPositive: boolean;
  };
  icon?: ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

export function EnhancedStatCard({
  title,
  value,
  asOfDate,
  includes,
  subtitle,
  change,
  momDelta,
  icon,
  className,
  variant = 'default',
}: EnhancedStatCardProps) {
  const variantStyles = {
    default: '',
    primary: 'bg-primary/5 border-primary/20',
    success: 'bg-success/5 border-success/20',
    warning: 'bg-warning/5 border-warning/20',
  };

  return (
    <Card className={cn('relative overflow-hidden', variantStyles[variant], className)}>
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
              {asOfDate && (
                <span className="text-[10px] text-muted-foreground/70 shrink-0">
                  As of: {formatDate(asOfDate, 'short')}
                </span>
              )}
            </div>
            <p className="text-2xl lg:text-3xl font-bold tracking-tight">{value}</p>
            
            {includes && (
              <p className="text-[10px] text-muted-foreground/80 leading-tight">
                Includes: {includes}
              </p>
            )}
            
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            
            <div className="flex items-center gap-3 flex-wrap">
              {momDelta && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-sm font-medium',
                    momDelta.isPositive ? 'text-success' : 'text-destructive'
                  )}
                >
                  {momDelta.isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{momDelta.value}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">MoM</span>
                </div>
              )}
              
              {change && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-sm font-medium',
                    change.isPositive === true && 'text-success',
                    change.isPositive === false && 'text-destructive',
                    change.isPositive === null && 'text-muted-foreground'
                  )}
                >
                  {change.isPositive === true && <TrendingUp className="h-4 w-4" />}
                  {change.isPositive === false && <TrendingDown className="h-4 w-4" />}
                  {change.isPositive === null && <Minus className="h-4 w-4" />}
                  {change.value}
                </div>
              )}
            </div>
          </div>
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
