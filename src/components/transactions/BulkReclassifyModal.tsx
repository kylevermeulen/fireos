import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCompactCurrency } from '@/lib/format';

interface SimilarTransaction {
  id: string;
  transaction_date: string;
  description: string | null;
  amount_aud: number;
  source_account_name: string | null;
}

interface BulkReclassifyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceDescription: string;
  newL1: string;
  isTransfer: boolean;
  excludeId: string;
  /** Called for each updated transaction for optimistic UI */
  onBulkUpdate?: (ids: string[], newL1: string, isTransfer: boolean) => void;
}

function extractKeyword(description: string): string {
  // Strip common transfer prefixes
  const cleaned = description
    .replace(/^(transfer from|transfer to|payment to|direct debit|bpay|visa purchase|eftpos)\s*/i, '')
    .trim();
  return cleaned.substring(0, 15).trim();
}

export function BulkReclassifyModal({
  open,
  onOpenChange,
  sourceDescription,
  newL1,
  isTransfer,
  excludeId,
  onBulkUpdate,
}: BulkReclassifyModalProps) {
  const [similar, setSimilar] = useState<SimilarTransaction[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !sourceDescription) return;

    const keyword = extractKeyword(sourceDescription);
    if (keyword.length < 3) {
      setSimilar([]);
      return;
    }

    setIsLoading(true);
    supabase
      .from('transactions')
      .select('id, transaction_date, description, amount_aud, source_account_name')
      .ilike('description', `%${keyword}%`)
      .is('l1_category', null)
      .neq('id', excludeId)
      .limit(50)
      .then(({ data, error }) => {
        setIsLoading(false);
        if (error || !data) {
          setSimilar([]);
          return;
        }
        setSimilar(data as SimilarTransaction[]);
        setSelected(new Set(data.map(d => d.id)));
      });
  }, [open, sourceDescription, excludeId]);

  const handleConfirm = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    setIsUpdating(true);
    const { error } = await supabase
      .from('transactions')
      .update({ l1_category: newL1, l2_category: null, is_internal_transfer: isTransfer })
      .in('id', ids);

    setIsUpdating(false);
    if (error) {
      toast({ title: 'Bulk update failed', variant: 'destructive' });
    } else {
      toast({ title: `Updated ${ids.length} transactions to ${newL1}` });
      onBulkUpdate?.(ids, newL1, isTransfer);
    }
    onOpenChange(false);
  };

  const toggleAll = () => {
    if (selected.size === similar.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(similar.map(s => s.id)));
    }
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading || similar.length === 0) return null;

  return (
    <Dialog open={open && similar.length > 0} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Apply to similar transactions?</DialogTitle>
          <DialogDescription className="text-sm">
            Found {similar.length} uncategorised transaction{similar.length > 1 ? 's' : ''} with similar descriptions.
            Apply <Badge variant="outline" className="mx-1 text-xs">{newL1}</Badge> to all?
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1">
            <button
              onClick={toggleAll}
              className="text-xs text-primary hover:underline mb-2"
            >
              {selected.size === similar.length ? 'Deselect all' : 'Select all'}
            </button>
            {similar.map(tx => (
              <label
                key={tx.id}
                className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selected.has(tx.id)}
                  onCheckedChange={() => toggle(tx.id)}
                />
                <span className="text-xs truncate flex-1">{tx.description}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatCompactCurrency(Math.abs(tx.amount_aud))}
                </span>
              </label>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Skip
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={isUpdating || selected.size === 0}>
            {isUpdating ? 'Updating...' : `Apply to ${selected.size} transaction${selected.size > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
