import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Goal, METRIC_LABELS, METRIC_ICONS } from '@/hooks/useGoals';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface GoalFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (goal: Partial<Goal>) => void;
  goal?: Goal | null;
  currentMetrics: Record<string, number>;
}

const METRIC_TYPES: Goal['metric_type'][] = [
  'net_worth',
  'savings_rate',
  'liquid_wealth',
  'investments',
  'retirement',
  'custom',
];

export function GoalFormDialog({ open, onClose, onSave, goal, currentMetrics }: GoalFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metricType, setMetricType] = useState<Goal['metric_type']>('net_worth');
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description || '');
      setMetricType(goal.metric_type);
      setTargetValue(goal.target_value.toString());
      setTargetDate(new Date(goal.target_date));
    } else {
      setTitle('');
      setDescription('');
      setMetricType('net_worth');
      setTargetValue('');
      setTargetDate(undefined);
    }
  }, [goal, open]);

  const handleSubmit = () => {
    if (!title || !targetValue || !targetDate) return;

    onSave({
      id: goal?.id,
      title,
      description: description || null,
      metric_type: metricType,
      target_value: Number(targetValue),
      target_date: format(targetDate, 'yyyy-MM-dd'),
      metric_config: {},
      display_order: goal?.display_order ?? 0,
    });
    onClose();
  };

  const currentValue = currentMetrics[metricType] ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title</Label>
            <Input
              id="title"
              placeholder="e.g., Reach $1M Net Worth"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Why is this goal important?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Metric to Track</Label>
            <Select value={metricType} onValueChange={(v) => setMetricType(v as Goal['metric_type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    <span className="flex items-center gap-2">
                      <span>{METRIC_ICONS[type]}</span>
                      <span>{METRIC_LABELS[type]}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Current: {metricType === 'savings_rate' ? `${currentValue.toFixed(1)}%` : `$${currentValue.toLocaleString()}`}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target">Target Value</Label>
            <div className="flex items-center gap-2">
              {metricType !== 'savings_rate' && <span className="text-muted-foreground">$</span>}
              <Input
                id="target"
                type="number"
                placeholder={metricType === 'savings_rate' ? 'e.g., 50' : 'e.g., 1000000'}
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
              {metricType === 'savings_rate' && <span className="text-muted-foreground">%</span>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !targetDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={setTargetDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title || !targetValue || !targetDate}>
            {goal ? 'Save Changes' : 'Create Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
