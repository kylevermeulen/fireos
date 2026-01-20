import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpsertMortgageOverride } from '@/hooks/useMortgageData';
import { toast } from 'sonner';

interface Field {
  key: string;
  label: string;
  value: number;
  suffix?: string;
  liabilityId?: string;
}

interface MortgageEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: Field[];
}

export function MortgageEditModal({
  open,
  onOpenChange,
  title,
  fields,
}: MortgageEditModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const upsertOverride = useUpsertMortgageOverride();

  useEffect(() => {
    const initial: Record<string, string> = {};
    fields.forEach(f => {
      initial[f.key] = f.value.toString();
    });
    setValues(initial);
  }, [fields, open]);

  const handleSave = async () => {
    try {
      for (const field of fields) {
        const numValue = parseFloat(values[field.key] || '0');
        if (!isNaN(numValue)) {
          await upsertOverride.mutateAsync({
            fieldName: field.key,
            fieldValue: {
              value: numValue,
              liability_id: field.liabilityId,
            },
          });
        }
      }
      toast.success('Saved successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save');
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {fields.map(field => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {field.suffix === '%' ? '' : '$'}
                </span>
                <Input
                  id={field.key}
                  type="number"
                  step={field.suffix === '%' ? '0.01' : '1'}
                  value={values[field.key] || ''}
                  onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className={field.suffix === '%' ? 'pr-8' : 'pl-8'}
                />
                {field.suffix === '%' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={upsertOverride.isPending}>
            {upsertOverride.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
