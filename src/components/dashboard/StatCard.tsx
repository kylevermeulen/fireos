import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: {
    value: string;
    isPositive: boolean | null;
  };
  icon?: ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

export function StatCard({
  title,
  value,
  subtitle,
  change,
  icon,
  className,
  variant = 'default',
}: StatCardProps) {
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
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl lg:text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
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
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
