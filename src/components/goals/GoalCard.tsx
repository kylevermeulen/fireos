import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Goal, METRIC_LABELS, METRIC_ICONS } from '@/hooks/useGoals';
import { formatCompactCurrency, formatPercent } from '@/lib/format';
import { Calendar, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { differenceInDays, format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  goal: Goal;
  currentValue: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function GoalCard({ goal, currentValue, onEdit, onDelete }: GoalCardProps) {
  const progress = goal.target_value > 0 
    ? Math.min(100, (currentValue / goal.target_value) * 100) 
    : 0;
  
  const isCompleted = progress >= 100;
  const targetDate = new Date(goal.target_date);
  const daysRemaining = differenceInDays(targetDate, new Date());
  const isOverdue = isPast(targetDate) && !isCompleted;

  const formatValue = (value: number) => {
    if (goal.metric_type === 'savings_rate') {
      return formatPercent(value, 1);
    }
    return formatCompactCurrency(value);
  };

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all',
      isCompleted && 'border-success/50 bg-success/5',
      isOverdue && 'border-destructive/50 bg-destructive/5'
    )}>
      {isCompleted && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
        </div>
      )}
      
      <CardContent className="pt-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl">{METRIC_ICONS[goal.metric_type]}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{goal.title}</h3>
            {goal.description && (
              <p className="text-sm text-muted-foreground truncate">{goal.description}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Values */}
          <div className="flex justify-between text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Current</div>
              <div className="font-semibold">{formatValue(currentValue)}</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground text-xs">Target</div>
              <div className="font-semibold">{formatValue(goal.target_value)}</div>
            </div>
          </div>

          {/* Target date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {format(targetDate, 'MMM d, yyyy')}
              </span>
            </div>
            <Badge variant={isOverdue ? 'destructive' : isCompleted ? 'default' : 'secondary'}>
              {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : `${daysRemaining}d left`}
            </Badge>
          </div>

          {/* Metric type */}
          <div className="text-xs text-muted-foreground">
            Tracking: {METRIC_LABELS[goal.metric_type]}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" className="flex-1" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
