import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback, useEffect } from 'react';

export interface CategoryRule {
  id?: string;
  keyword: string;
  l1_category: string;
  l2_category: string | null;
  is_internal_transfer: boolean;
  needs_review: boolean;
  priority: number;
}

// Default rules to seed
const DEFAULT_RULES: Omit<CategoryRule, 'id'>[] = [
  // Insurance
  { keyword: 'HCFHEALTH', l1_category: 'Insurance', l2_category: 'Health Insurance', is_internal_transfer: false, needs_review: false, priority: 0 },

  // Groceries
  { keyword: 'WOOLWORTHS', l1_category: 'Groceries', l2_category: 'Groceries', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'MARLEYSPOON', l1_category: 'Groceries', l2_category: 'Groceries', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'HAPPYFRESH', l1_category: 'Groceries', l2_category: 'Groceries', is_internal_transfer: false, needs_review: false, priority: 0 },

  // Shopping
  { keyword: 'BUNNINGS', l1_category: 'Shopping', l2_category: 'Household', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'FRANK GREEN', l1_category: 'Shopping', l2_category: 'Shopping', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'AUSPOST', l1_category: 'Shopping', l2_category: 'Shopping', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'EMMA JANE HARDEE', l1_category: 'Shopping', l2_category: 'Shopping', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'TOKOPEDIA', l1_category: 'Shopping', l2_category: 'Shopping', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'TECHNO COMPUTER', l1_category: 'Shopping', l2_category: 'Shopping', is_internal_transfer: false, needs_review: false, priority: 0 },

  // Entertainment
  { keyword: 'CRUNCHLABS', l1_category: 'Entertainment', l2_category: 'Entertainment', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'OZ LOTTERIES', l1_category: 'Entertainment', l2_category: 'Entertainment', is_internal_transfer: false, needs_review: false, priority: 0 },

  // Donations
  { keyword: 'STROKE FOUNDATION', l1_category: 'Donations', l2_category: 'Donations', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'OCRF', l1_category: 'Donations', l2_category: 'Donations', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'DEMENTIA AUSTRALIA', l1_category: 'Donations', l2_category: 'Donations', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'CANCER COUNCIL', l1_category: 'Donations', l2_category: 'Donations', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'SP GREENFLEET', l1_category: 'Donations', l2_category: 'Donations', is_internal_transfer: false, needs_review: false, priority: 0 },

  // Professional Services
  { keyword: 'FINDEX', l1_category: 'Professional Services', l2_category: 'Professional Services', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'MR GREG MALHAM', l1_category: 'Professional Services', l2_category: 'Professional Services', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'CRYPTOTAXCALCULATOR', l1_category: 'Professional Services', l2_category: 'Professional Services', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'AIRTASKER', l1_category: 'Professional Services', l2_category: 'Professional Services', is_internal_transfer: false, needs_review: false, priority: 0 },

  // Utilities & Bills  
  { keyword: 'AUSPOST Mail Redirect', l1_category: 'Utilities & Bills', l2_category: 'Utilities & Bills', is_internal_transfer: false, needs_review: false, priority: 10 }, // Higher priority than generic AUSPOST
  { keyword: 'DOKU', l1_category: 'Utilities & Bills', l2_category: 'Utilities & Bills', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'GLOBALXTREME', l1_category: 'Utilities & Bills', l2_category: 'Utilities & Bills', is_internal_transfer: false, needs_review: false, priority: 0 },

  // Transport
  { keyword: 'COPP PARKING', l1_category: 'Transport', l2_category: 'Transport', is_internal_transfer: false, needs_review: false, priority: 0 },

  // Travel
  { keyword: 'LOTTE TRAVEL RETAIL', l1_category: 'Travel', l2_category: 'Travel', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'MIDSTAY', l1_category: 'Travel', l2_category: 'Travel', is_internal_transfer: false, needs_review: false, priority: 0 },

  // Health & Fitness
  { keyword: 'QI HEALING MASSAGE', l1_category: 'Health & Fitness', l2_category: 'Health & Fitness', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'GETMOSH', l1_category: 'Health & Fitness', l2_category: 'Health & Fitness', is_internal_transfer: false, needs_review: false, priority: 0 },

  // Restaurants & Cafes
  { keyword: 'HANOI ROSE', l1_category: 'Restaurants & Cafes', l2_category: 'Restaurants & Cafes', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'KTOWN HOSPITALITY', l1_category: 'Restaurants & Cafes', l2_category: 'Restaurants & Cafes', is_internal_transfer: false, needs_review: false, priority: 0 },

  // Internal Transfers
  { keyword: 'GO-PAY CUSTOMER', l1_category: 'Transfer', l2_category: 'Internal Transfer', is_internal_transfer: true, needs_review: false, priority: 0 },

  // Indonesia Rent (migrated from hardcoded Wise rent fix)
  { keyword: 'LISA MICHELLE CROSBY', l1_category: 'Indonesia Rent', l2_category: 'Indonesia Rent (Prepaid)', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'ADYATAMA', l1_category: 'Indonesia Rent', l2_category: 'Indonesia Rent (Prepaid)', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'BALIMOVES', l1_category: 'Indonesia Rent', l2_category: 'Indonesia Rent (Prepaid)', is_internal_transfer: false, needs_review: false, priority: 0 },
  { keyword: 'INVOICE 001', l1_category: 'Indonesia Rent', l2_category: 'Indonesia Rent (Prepaid)', is_internal_transfer: false, needs_review: false, priority: 0 },

  // Needs review
  { keyword: 'CENTRELINK', l1_category: 'Utilities & Bills', l2_category: 'Government', is_internal_transfer: false, needs_review: true, priority: 0 },
];

export function useCategoryRules() {
  const { toast } = useToast();
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('category_rules')
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      setRules(data ?? []);
    } catch (err) {
      console.error('Failed to fetch category rules:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const seedRules = useCallback(async () => {
    setIsSeeding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      const toInsert = DEFAULT_RULES.map(r => ({ ...r, user_id: user.id }));

      // Upsert to avoid duplicates
      const { error } = await supabase
        .from('category_rules')
        .upsert(toInsert, { onConflict: 'user_id,keyword' });
      if (error) throw error;

      toast({ title: 'Category rules seeded', description: `${toInsert.length} rules created/updated` });
      await fetchRules();
    } catch (err) {
      console.error('Seed rules error:', err);
      toast({ title: 'Failed to seed rules', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsSeeding(false);
    }
  }, [fetchRules, toast]);

  /**
   * Apply rules to a description string. Returns the best matching rule
   * (longest keyword match with highest priority wins).
   */
  const applyRules = useCallback((description: string): CategoryRule | null => {
    if (!description || rules.length === 0) return null;

    const upper = description.toUpperCase();
    let bestMatch: CategoryRule | null = null;
    let bestLen = 0;

    for (const rule of rules) {
      const kw = rule.keyword.toUpperCase();
      if (upper.includes(kw)) {
        // Prefer longer keywords, then higher priority
        if (kw.length > bestLen || (kw.length === bestLen && rule.priority > (bestMatch?.priority ?? 0))) {
          bestMatch = rule;
          bestLen = kw.length;
        }
      }
    }

    return bestMatch;
  }, [rules]);

  return { rules, isLoading, isSeeding, seedRules, applyRules, fetchRules };
}
