import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

interface CashflowCategoryFiltersProps {
  l1Categories: string[];
  l2Categories: string[];
  l1Filter: string | null;
  l2Filter: string | null;
  onL1Change: (value: string | null) => void;
  onL2Change: (value: string | null) => void;
  onClear: () => void;
}

export function CashflowCategoryFilters({
  l1Categories,
  l2Categories,
  l1Filter,
  l2Filter,
  onL1Change,
  onL2Change,
  onClear,
}: CashflowCategoryFiltersProps) {
  const hasFilters = l1Filter || l2Filter;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={l1Filter || 'all'}
        onValueChange={(val) => onL1Change(val === 'all' ? null : val)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All L1 Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All L1 Categories</SelectItem>
          {l1Categories.map((cat) => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={l2Filter || 'all'}
        onValueChange={(val) => onL2Change(val === 'all' ? null : val)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All L2 Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All L2 Categories</SelectItem>
          {l2Categories.map((cat) => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-8 px-2">
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
