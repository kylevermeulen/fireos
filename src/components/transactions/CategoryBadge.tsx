import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { L1_DISPLAY_ORDER } from '@/components/transactions/InlineCategoryEditor';

interface CategoryBadgeProps {
  transactionId: string;
  currentL1: string | null;
  currentL2: string | null;
  onUpdate: () => void;
}

export function CategoryBadge({ transactionId, currentL1, currentL2, onUpdate }: CategoryBadgeProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const label = currentL1
    ? (currentL2 && currentL2 !== 'Unknown' ? `${currentL1} › ${currentL2}` : currentL1)
    : 'Uncategorised';

  const handleSelect = async (l1: string) => {
    setOpen(false);
    setSaving(true);
    const isTransfer = l1 === 'Transfer — Internal';
    const { error } = await supabase
      .from('transactions')
      .update({ l1_category: l1, l2_category: null, is_internal_transfer: isTransfer })
      .eq('id', transactionId);
    setSaving(false);
    if (error) {
      toast({ title: 'Failed to update category', variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={saving}
          className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 max-w-[180px] truncate"
          title={label}
        >
          {saving ? '…' : label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
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
  );
}
