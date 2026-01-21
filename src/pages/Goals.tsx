import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalFormDialog } from '@/components/goals/GoalFormDialog';
import { EmptyGoalSlot } from '@/components/goals/EmptyGoalSlot';
import { useGoals, useGoalMutations, useGoalMetrics, Goal } from '@/hooks/useGoals';
import { Target, Users } from 'lucide-react';
import { toast } from 'sonner';

const MAX_GOALS = 5;

export default function Goals() {
  const { data: goals, isLoading } = useGoals();
  const { createGoal, updateGoal, deleteGoal } = useGoalMutations();
  const metrics = useGoalMetrics();

  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const handleAddGoal = () => {
    setEditingGoal(null);
    setFormOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormOpen(true);
  };

  const handleSaveGoal = async (goalData: Partial<Goal>) => {
    try {
      if (goalData.id) {
        await updateGoal.mutateAsync({
          id: goalData.id,
          title: goalData.title,
          description: goalData.description,
          target_value: goalData.target_value,
          target_date: goalData.target_date,
          metric_type: goalData.metric_type,
          metric_config: goalData.metric_config,
        });
        toast.success('Goal updated!');
      } else {
        await createGoal.mutateAsync({
          title: goalData.title!,
          description: goalData.description ?? null,
          target_value: goalData.target_value!,
          target_date: goalData.target_date!,
          metric_type: goalData.metric_type!,
          metric_config: goalData.metric_config ?? {},
          display_order: (goals?.length ?? 0),
        });
        toast.success('Goal created!');
      }
    } catch {
      toast.error('Failed to save goal');
    }
  };

  const handleDeleteGoal = async (goal: Goal) => {
    try {
      await deleteGoal.mutateAsync(goal.id);
      toast.success('Goal deleted');
    } catch {
      toast.error('Failed to delete goal');
    }
  };

  const getCurrentValue = (goal: Goal): number => {
    switch (goal.metric_type) {
      case 'net_worth':
        return metrics.net_worth;
      case 'savings_rate':
        return metrics.savings_rate;
      case 'liquid_wealth':
        return metrics.liquid_wealth;
      case 'investments':
        return metrics.investments;
      case 'retirement':
        return metrics.retirement;
      default:
        return goal.current_value;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
            <p className="text-muted-foreground">Track your financial goals together</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[280px]" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const goalsArray = goals ?? [];
  const emptySlots = MAX_GOALS - goalsArray.length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Family Goals
            </h1>
            <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
              <Users className="h-4 w-4" />
              5 goal slots for you and your partner to track together
            </p>
          </div>
          {goalsArray.length < MAX_GOALS && (
            <Button onClick={handleAddGoal}>
              Add Goal
            </Button>
          )}
        </div>

        {/* Progress Summary */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{goalsArray.length}</div>
                <div className="text-xs text-muted-foreground">Active Goals</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  {goalsArray.filter(g => getCurrentValue(g) >= g.target_value).length}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {goalsArray.length > 0 
                    ? Math.round(goalsArray.reduce((sum, g) => sum + Math.min(100, (getCurrentValue(g) / g.target_value) * 100), 0) / goalsArray.length)
                    : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Avg Progress</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{MAX_GOALS - goalsArray.length}</div>
                <div className="text-xs text-muted-foreground">Slots Available</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {goalsArray.filter(g => new Date(g.target_date) < new Date() && getCurrentValue(g) < g.target_value).length}
                </div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goalsArray.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currentValue={getCurrentValue(goal)}
              onEdit={() => handleEditGoal(goal)}
              onDelete={() => handleDeleteGoal(goal)}
            />
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <EmptyGoalSlot
              key={`empty-${i}`}
              slotNumber={goalsArray.length + i + 1}
              onAdd={handleAddGoal}
            />
          ))}
        </div>

        {/* Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goal Setting Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• <strong>Be specific:</strong> "Save $50K for house deposit" is better than "Save more money"</p>
            <p>• <strong>Set realistic timelines:</strong> Choose dates that challenge but don't overwhelm</p>
            <p>• <strong>Mix goal types:</strong> Combine short-term (3-6 months) with long-term (1-5 years) goals</p>
            <p>• <strong>Review regularly:</strong> Check in weekly or monthly to stay on track</p>
            <p>• <strong>Celebrate wins:</strong> Acknowledge progress, not just completion!</p>
          </CardContent>
        </Card>
      </div>

      <GoalFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveGoal}
        goal={editingGoal}
        currentMetrics={metrics}
      />
    </AppLayout>
  );
}
