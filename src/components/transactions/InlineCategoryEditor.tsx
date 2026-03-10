import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Master L1 → L2 category map
const CATEGORY_TREE: Record<string, string[]> = {
  'Income': ['Salary', 'Interest', 'Dividends', 'Government', 'Business', 'Other'],
  'Living Expenses': ['Groceries', 'Eating Out', 'Phone', 'Internet', 'Other'],
  'Housing': ['Rent', 'Mortgage', 'Utilities', 'Homewares', 'Maintenance', 'Other'],
  'Transport': ['Fuel', 'Public Transport', 'Rideshare', 'Parking', 'Car', 'Other'],
  'Lifestyle': ['Entertainment', 'Subscriptions', 'Travel', 'Health & Fitness', 'Personal Care', 'Clothing', 'Gifts', 'Books & Media', 'Pets', 'Other'],
  'Health': ['Medical', 'Pharmacy', 'Dental', 'Other'],
  'Insurance': ['Health Insurance', 'Car Insurance', 'Home Insurance', 'Life', 'Other'],
  'Education': ['Tuition', 'Books', 'Other'],
  'Shopping': ['Household', 'Electronics', 'Shopping', 'Other'],
  'Groceries': ['Groceries', 'Other'],
  'Restaurants & Cafes': ['Restaurants & Cafes', 'Other'],
  'Entertainment': ['Entertainment', 'Other'],
  'Donations': ['Donations', 'Other'],
  'Professional Services': ['Professional Services', 'Accounting', 'Legal', 'Other'],
  'Utilities & Bills': ['Utilities & Bills', 'Government', 'Other'],
  'Transfer': ['Internal Transfer', 'Other'],
  'Indonesia Rent': ['Indonesia Rent (Prepaid)', 'Other'],
  'Travel': ['Flights', 'Accommodation', 'Travel', 'Other'],
  'Tax': ['Income Tax', 'Other'],
  'Fees': ['Bank Fees', 'Other'],
  'Uncategorised': [],
};

const L1_OPTIONS = Object.keys(CATEGORY_TREE).sort();

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
