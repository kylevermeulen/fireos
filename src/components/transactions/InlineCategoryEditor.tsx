import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Canonical L1 display order
export const L1_DISPLAY_ORDER = [
  'Food Delivery & Taxi',
  'Restaurants, Cafes & Bars',
  'Groceries',
  'Mortgage',
  'Rent',
  'Utilities & Bills',
  'Household',
  'School Fees',
  'Family',
  'Personal Care',
  'Shopping',
  'Health & Fitness',
  'Entertainment',
  'Subscriptions',
  'Travel',
  'Ntegrity',
  'Income',
  'Investing',
  'Insurance',
  'Donations',
  'Taxes & Govt Fees',
  'Professional Services',
  'Transfer — Internal',
  'Indonesia — Uncategorised',
  'Australia — Uncategorised',
  'Uncategorised',
];

// Master L1 → L2 category map
const CATEGORY_TREE: Record<string, string[]> = {
  'Food Delivery & Taxi': [],
  'Restaurants, Cafes & Bars': [],
  'Groceries': [],
  'Mortgage': ['Fixed Repayment', 'Variable Repayment', 'Interest'],
  'Rent': ['Bali Rent'],
  'Utilities & Bills': ['Australia Utility & Bill', 'Indonesia Utility & Bills'],
  'Household': ['Maintenance', 'Staff', 'Homewares'],
  'School Fees': [],
  'Family': ['Kids Activities', 'Kids Pocket Money'],
  'Personal Care': [],
  'Shopping': [],
  'Health & Fitness': [],
  'Entertainment': [],
  'Subscriptions': [],
  'Travel': ['Flights', 'Accommodation'],
  'Ntegrity': [],
  'Income': ['Salary', 'Rental Income', 'Other'],
  'Investing': [],
  'Insurance': [],
  'Donations': [],
  'Taxes & Govt Fees': [],
  'Professional Services': [],
  'Transfer — Internal': [],
  'Indonesia — Uncategorised': [],
  'Australia — Uncategorised': [],
  'Uncategorised': [],
};

// Sort L1 options by canonical display order, with unknown categories at the end
const L1_OPTIONS = Object.keys(CATEGORY_TREE).sort((a, b) => {
  const ai = L1_DISPLAY_ORDER.indexOf(a);
  const bi = L1_DISPLAY_ORDER.indexOf(b);
  return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
});

interface InlineCategoryEditorProps {
  transactionId: string;
  currentL1: string | null;
  currentL2: string | null;
  onUpdated: (id: string, l1: string | null, l2: string | null) => void;
}

export function InlineL1Editor({ transactionId, currentL1, onUpdated }: Omit<InlineCategoryEditorProps, 'currentL2'> & { onUpdated: (id: string, l1: string | null, l2: string | null) => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleChange = async (value: string) => {
    const l1 = value === '__clear__' ? null : value;
    setSaving(true);
    const { error } = await supabase
      .from('transactions')
      .update({ l1_category: l1, l2_category: null })
      .eq('id', transactionId);
    setSaving(false);
    if (error) {
      toast({ title: 'Failed to update category', variant: 'destructive' });
    } else {
      onUpdated(transactionId, l1, null);
    }
  };

  return (
    <Select value={currentL1 ?? ''} onValueChange={handleChange} disabled={saving}>
      <SelectTrigger className="h-6 text-xs border-none shadow-none bg-transparent px-1 min-w-[100px] hover:bg-muted/50">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__clear__">
          <span className="text-muted-foreground">Clear</span>
        </SelectItem>
        {L1_OPTIONS.map(l1 => (
          <SelectItem key={l1} value={l1}>{l1}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function InlineL2Editor({ transactionId, currentL1, currentL2, onUpdated }: InlineCategoryEditorProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  if (!currentL1) return <span className="text-xs text-muted-foreground">—</span>;

  const l2Options = CATEGORY_TREE[currentL1] ?? [];

  const handleChange = async (value: string) => {
    const l2 = value === '__clear__' ? null : value;
    setSaving(true);
    const { error } = await supabase
      .from('transactions')
      .update({ l2_category: l2 })
      .eq('id', transactionId);
    setSaving(false);
    if (error) {
      toast({ title: 'Failed to update category', variant: 'destructive' });
    } else {
      onUpdated(transactionId, currentL1, l2);
    }
  };

  if (l2Options.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <Select value={currentL2 ?? ''} onValueChange={handleChange} disabled={saving}>
      <SelectTrigger className="h-6 text-xs border-none shadow-none bg-transparent px-1 min-w-[80px] hover:bg-muted/50">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__clear__">
          <span className="text-muted-foreground">Clear</span>
        </SelectItem>
        {l2Options.map(l2 => (
          <SelectItem key={l2} value={l2}>{l2}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { CATEGORY_TREE, L1_OPTIONS };
