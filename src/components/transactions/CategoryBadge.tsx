import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { L1_DISPLAY_ORDER } from '@/components/transactions/InlineCategoryEditor';
import { BulkReclassifyModal } from '@/components/transactions/BulkReclassifyModal';

interface CategoryBadgeProps {
  transactionId: string;
  currentL1: string | null;
  currentL2: string | null;
  description?: string | null;
  /** Called with the new L1 immediately for optimistic local state update */
  onOptimisticUpdate?: (transactionId: string, newL1: string, isTransfer: boolean) => void;
  /** Called for bulk updates */
  onBulkUpdate?: (ids: string[], newL1: string, isTransfer: boolean) => void;
  /** Legacy full-reload callback (only called on rollback failure) */
  onUpdate?: () => void;
}

export function CategoryBadge({ transactionId, currentL1, currentL2, description, onOptimisticUpdate, onBulkUpdate, onUpdate }: CategoryBadgeProps) {
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [lastSelected, setLastSelected] = useState<{ l1: string; isTransfer: boolean } | null>(null);
  const { toast } = useToast();

  const label = currentL1
    ? (currentL2 && currentL2 !== 'Unknown' ? `${currentL1} › ${currentL2}` : currentL1)
    : 'Uncategorised';

  const handleSelect = async (l1: string) => {
    setOpen(false);
    const isTransfer = l1 === 'Transfer — Internal';

    // Optimistic: update parent state immediately
    if (onOptimisticUpdate) {
      onOptimisticUpdate(transactionId, l1, isTransfer);
    }

    // Background DB update
    const { error } = await supabase
      .from('transactions')
      .update({ l1_category: l1, l2_category: null, is_internal_transfer: isTransfer })
      .eq('id', transactionId);

    if (error) {
      toast({ title: 'Failed to update category', variant: 'destructive' });
      onUpdate?.();
    } else if (description) {
      // On success, check for similar transactions to bulk-reclassify
      setLastSelected({ l1, isTransfer });
      setBulkOpen(true);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors cursor-pointer max-w-[180px] truncate"
            title={label}
            onClick={(e) => e.stopPropagation()}
          >
            {label}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start" onClick={(e) => e.stopPropagation()}>
          <Command>
            <CommandInput placeholder="Search category…" />
            <CommandList>
              <CommandEmpty>No category found.</CommandEmpty>
              {L1_DISPLAY_ORDER.map(l1 => (
                <CommandItem key={l1} value={l1} onSelect={() => handleSelect(l1)}>
                  {l1}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {lastSelected && description && (
        <BulkReclassifyModal
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          sourceDescription={description}
          newL1={lastSelected.l1}
          isTransfer={lastSelected.isTransfer}
          excludeId={transactionId}
          onBulkUpdate={onBulkUpdate}
        />
      )}
    </>
  );
}
