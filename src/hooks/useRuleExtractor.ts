import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback } from 'react';

interface ExtractedRule {
  keyword: string;
  l1_category: string;
  l2_category: string | null;
  is_internal_transfer: boolean;
  occurrences: number;
}

/**
 * Parse a CSV line handling quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\"') { if (inQ && line[i + 1] === '\"') { cur += '\"'; i++; } else inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Extract a shorter keyword from a raw bank description.
 * Removes card numbers, dates, amounts, and other noise.
 */
function extractKeyword(counterparty: string): string {
  let s = counterparty.trim();

  // Remove "Value Date: ..." suffix
  s = s.replace(/\s*Value Date:.*$/i, '');
  // Remove card references like "Card xx3116"
  s = s.replace(/\s*Card\s+xx\d+/gi, '');
  // Remove currency amounts like "EUR 146.00" or "AUD 100"
  s = s.replace(/\s+(AUD|USD|EUR|IDR|GBP|NZD|SGD|JPY|CAD)\s+[\d.,]+/gi, '');
  // Remove "from CommBank App ..." suffix (keep the purpose word though)
  s = s.replace(/\s+from CommBank App\s*/i, ' ');
  // Remove "PayID Email" / "PayID Phone"
  s = s.replace(/\s*PayID\s+(Email|Phone)/gi, '');
  // Remove "CommBank app" / "NetBank"
  s = s.replace(/\s*(CommBank\s*app|NetBank)/gi, '');
  // Remove transfer prefixes
  s = s.replace(/^(Transfer\s+To|Transfer\s+from|Direct\s+Credit\s+\d+)\s+/i, '');
  // Remove trailing location info like "SYDNEY NS AUS" or "SIPPY DOWNS AUS"
  s = s.replace(/\s+(AUS|CAN|FRA|USA|GBR|NZL|SGP|IDN)\s*$/i, '');
  // Remove "International Transaction Fee" (noise)
  if (/^International Transaction Fee/i.test(s)) return 'International Transaction Fee';

  // Clean up whitespace
  s = s.replace(/\s+/g, ' ').trim();

  // If still too long, take the meaningful prefix (first 40 chars or up to first digit sequence)
  if (s.length > 50) {
    // Try to find a natural cutoff
    const cutoff = s.search(/\d{4,}/);
    if (cutoff > 10) s = s.substring(0, cutoff).trim();
    else s = s.substring(0, 50).trim();
  }

  return s;
}

export function useRuleExtractor() {
  const { toast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedRules, setExtractedRules] = useState<ExtractedRule[]>([]);

  const extractFromCsv = useCallback(async (csvPath: string = '/data/cashflow_actual.csv') => {
    setIsExtracting(true);
    try {
      const response = await fetch(csvPath);
      if (!response.ok) throw new Error(`Failed to load ${csvPath}`);
      const content = await response.text();
      const lines = content.split('\n').filter(l => l.trim());
      if (lines.length < 2) throw new Error('CSV is empty');

      // Build a map of keyword → { l1, l2, is_internal, count }
      const ruleMap = new Map<string, { l1: string; l2: string; is_transfer: boolean; count: number }>();

      for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i]);
        if (cells.length < 11) continue;

        const counterparty = (cells[2] ?? '').trim();
        const isTransfer = (cells[8] ?? '').toLowerCase() === 'true';
        const l1 = (cells[9] ?? '').trim();
        const l2 = (cells[10] ?? '').trim();

        // Skip empty categories and unknowns — those aren't useful rules
        if (!l1 || l1 === 'Unknown') continue;
        // Skip transfers with empty categories
        if (isTransfer && !l1) continue;

        const keyword = extractKeyword(counterparty);
        if (!keyword || keyword.length < 3) continue;

        const existing = ruleMap.get(keyword);
        if (existing) {
          existing.count++;
          // Keep the most common L1/L2 (first one wins for now)
        } else {
          ruleMap.set(keyword, { l1, l2: l2 || l1, is_transfer: isTransfer, count: 1 });
        }
      }

      const rules: ExtractedRule[] = Array.from(ruleMap.entries())
        .map(([keyword, data]) => ({
          keyword,
          l1_category: data.l1,
          l2_category: data.l2 || null,
          is_internal_transfer: data.is_transfer,
          occurrences: data.count,
        }))
        .sort((a, b) => b.occurrences - a.occurrences);

      setExtractedRules(rules);
      toast({
        title: 'Rules extracted',
        description: `Found ${rules.length} unique keyword→category mappings from ${lines.length - 1} transactions`,
      });

      return rules;
    } catch (err) {
      console.error('Rule extraction error:', err);
      toast({
        title: 'Extraction failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsExtracting(false);
    }
  }, [toast]);

  const saveRules = useCallback(async (rulesToSave: ExtractedRule[], needsReview: boolean = true) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      const records = rulesToSave.map(r => ({
        user_id: user.id,
        keyword: r.keyword,
        l1_category: r.l1_category,
        l2_category: r.l2_category,
        is_internal_transfer: r.is_internal_transfer,
        needs_review: needsReview,
        priority: 0,
      }));

      // Upsert in batches
      for (let i = 0; i < records.length; i += 200) {
        const batch = records.slice(i, i + 200);
        const { error } = await supabase
          .from('category_rules')
          .upsert(batch, { onConflict: 'user_id,keyword' });
        if (error) throw error;
      }

      toast({
        title: 'Rules saved',
        description: `${records.length} rules saved${needsReview ? ' (flagged for review)' : ''}`,
      });

      return true;
    } catch (err) {
      console.error('Save rules error:', err);
      toast({
        title: 'Failed to save rules',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  return { extractFromCsv, extractedRules, setExtractedRules, saveRules, isExtracting };
}
