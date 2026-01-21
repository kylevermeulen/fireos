import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface EmptyGoalSlotProps {
  slotNumber: number;
  onAdd: () => void;
}

export function EmptyGoalSlot({ slotNumber, onAdd }: EmptyGoalSlotProps) {
  return (
    <Card className="border-dashed border-2 bg-muted/20">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <div className="text-4xl text-muted-foreground/50 mb-2">🎯</div>
        <p className="text-sm text-muted-foreground mb-3">Goal Slot {slotNumber}</p>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Goal
        </Button>
      </CardContent>
    </Card>
  );
}
