import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tag, ChevronDown, FileText, Check, X, Trash2, Search } from 'lucide-react';
import { CategoryRule, useCategoryRules } from '@/hooks/useCategoryRules';
import { useRuleExtractor } from '@/hooks/useRuleExtractor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function CategoryRulesPanel() {
  const { rules, isLoading, seedRules, isSeeding, fetchRules } = useCategoryRules();
  const { extractFromCsv, extractedRules, setExtractedRules, saveRules, isExtracting } = useRuleExtractor();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showExtracted, setShowExtracted] = useState(false);
  const [ruleSearch, setRuleSearch] = useState('');
  const [selectedExtracted, setSelectedExtracted] = useState<Set<number>>(new Set());

  const reviewRules = useMemo(() => rules.filter(r => r.needs_review), [rules]);
  const confirmedRules = useMemo(() => rules.filter(r => !r.needs_review), [rules]);

  const filteredRules = useMemo(() => {
    if (!ruleSearch) return rules;
    const q = ruleSearch.toLowerCase();
    return rules.filter(r =>
      r.keyword.toLowerCase().includes(q) ||
      r.l1_category.toLowerCase().includes(q) ||
      (r.l2_category ?? '').toLowerCase().includes(q)
    );
  }, [rules, ruleSearch]);

  const handleExtract = async () => {
    const extracted = await extractFromCsv();
    if (extracted.length > 0) {
      setShowExtracted(true);
      setSelectedExtracted(new Set(extracted.map((_, i) => i)));
    }
  };

  const handleSaveSelected = async () => {
    const toSave = extractedRules.filter((_, i) => selectedExtracted.has(i));
    const success = await saveRules(toSave, true);
    if (success) {
      setShowExtracted(false);
      setExtractedRules([]);
      await fetchRules();
    }
  };

  const handleApproveRule = async (rule: CategoryRule) => {
    if (!rule.id) return;
    const { error } = await supabase
      .from('category_rules')
      .update({ needs_review: false })
      .eq('id', rule.id);
    if (error) {
      toast({ title: 'Failed to approve', variant: 'destructive' });
    } else {
      await fetchRules();
    }
  };

  const handleDeleteRule = async (rule: CategoryRule) => {
    if (!rule.id) return;
    const { error } = await supabase
      .from('category_rules')
      .delete()
      .eq('id', rule.id);
    if (error) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    } else {
      await fetchRules();
    }
  };

  const toggleExtracted = (idx: number) => {
    setSelectedExtracted(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Category Rules
                <Badge variant="secondary">{confirmedRules.length} confirmed</Badge>
                {reviewRules.length > 0 && (
                  <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">{reviewRules.length} to review</Badge>
                )}
              </CardTitle>
              <ChevronDown className={cn('h-5 w-5 transition-transform', isOpen && 'rotate-180')} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={seedRules} disabled={isSeeding}>
                {isSeeding ? 'Seeding...' : 'Seed Default Rules'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExtract} disabled={isExtracting}>
                <FileText className="h-4 w-4 mr-1" />
                {isExtracting ? 'Extracting...' : 'Extract from Cashflow CSV'}
              </Button>
            </div>

            {/* Extracted rules review panel */}
            {showExtracted && extractedRules.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Extracted Rules — {selectedExtracted.size} of {extractedRules.length} selected
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedExtracted(new Set(extractedRules.map((_, i) => i)))}>
                        Select All
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedExtracted(new Set())}>
                        Deselect All
                      </Button>
                      <Button size="sm" onClick={handleSaveSelected} disabled={selectedExtracted.size === 0}>
                        Save {selectedExtracted.size} Rules
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowExtracted(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Keyword</TableHead>
                          <TableHead>L1</TableHead>
                          <TableHead>L2</TableHead>
                          <TableHead className="text-right">Hits</TableHead>
                          <TableHead>Transfer?</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extractedRules.map((r, i) => (
                          <TableRow
                            key={i}
                            className={cn('cursor-pointer', !selectedExtracted.has(i) && 'opacity-40')}
                            onClick={() => toggleExtracted(i)}
                          >
                            <TableCell>
                              <input type="checkbox" checked={selectedExtracted.has(i)} readOnly className="pointer-events-none" />
                            </TableCell>
                            <TableCell className="text-xs font-mono max-w-[200px] truncate">{r.keyword}</TableCell>
                            <TableCell className="text-xs">{r.l1_category}</TableCell>
                            <TableCell className="text-xs">{r.l2_category ?? '—'}</TableCell>
                            <TableCell className="text-xs text-right">{r.occurrences}</TableCell>
                            <TableCell className="text-xs">{r.is_internal_transfer ? '✓' : ''}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Search existing rules */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rules..."
                value={ruleSearch}
                onChange={e => setRuleSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Rules needing review */}
            {reviewRules.length > 0 && !ruleSearch && (
              <div>
                <h3 className="text-sm font-medium mb-2 text-orange-600">Needs Review ({reviewRules.length})</h3>
                <ScrollArea className="max-h-[200px]">
                  <Table>
                    <TableBody>
                      {reviewRules.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs font-mono max-w-[200px] truncate">{r.keyword}</TableCell>
                          <TableCell className="text-xs">{r.l1_category}</TableCell>
                          <TableCell className="text-xs">{r.l2_category ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleApproveRule(r)}>
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteRule(r)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {/* All rules */}
            <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>L1</TableHead>
                    <TableHead>L2</TableHead>
                    <TableHead>Transfer?</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ruleSearch ? filteredRules : confirmedRules).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs font-mono max-w-[200px] truncate">{r.keyword}</TableCell>
                      <TableCell className="text-xs">{r.l1_category}</TableCell>
                      <TableCell className="text-xs">{r.l2_category ?? '—'}</TableCell>
                      <TableCell className="text-xs">{r.is_internal_transfer ? '✓' : ''}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteRule(r)}>
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRules.length === 0 && ruleSearch && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm">No rules match</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
