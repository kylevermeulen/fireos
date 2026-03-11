import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useBudgetData, BudgetRow } from '@/hooks/useBudgetData';
import { formatCompactCurrency } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUp, ArrowDown, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addMonths, subMonths, isSameMonth, format } from 'date-fns';

function BudgetInput({ row, onSave }: { row: BudgetRow; onSave: (cat: string, amount: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(row.budget !== null ? String(row.budget) : '');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setEditing(false);
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onSave(row.category, num);
    }
  };

  if (!editing) {
    return (
      <button
        className="text-left w-full px-2 py-1 rounded hover:bg-accent transition-colors text-sm"
        onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}
      >
        {row.budget !== null ? formatCompactCurrency(row.budget) : '—'}
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      type="number"
      min="0"
      step="50"
      className="h-8 w-28 text-sm"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
    />
  );
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <ArrowUp className="h-4 w-4 text-destructive/70" />;
  if (trend === 'down') return <ArrowDown className="h-4 w-4 text-emerald-500/70" />;
  return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
}

export default function Budget() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now);
  const { rows, summary, upsertBudget } = useBudgetData(selectedMonth);
  const navigate = useNavigate();

  const isCurrentMonth = isSameMonth(selectedMonth, now);
  const monthLabel = isCurrentMonth ? 'This Month' : format(selectedMonth, 'MMMM yyyy');
  const columnLabel = isCurrentMonth ? 'This Month' : format(selectedMonth, 'MMMM');

  const goBack = () => setSelectedMonth((m) => subMonths(m, 1));
  const goForward = () => {
    if (!isCurrentMonth) setSelectedMonth((m) => addMonths(m, 1));
  };

  const handleSave = (category: string, amount: number) => {
    upsertBudget.mutate({ category, amount });
  };

  const handleCategoryClick = (category: string) => {
    navigate('/cashflow');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
            <p className="text-muted-foreground">Monthly spending targets vs actuals</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[130px] text-center">{monthLabel}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={goForward}
              disabled={isCurrentMonth}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Budgeted</p>
              <p className="text-xl font-bold">{formatCompactCurrency(summary.totalBudgeted)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Spent {columnLabel}</p>
              <p className="text-xl font-bold">{formatCompactCurrency(summary.totalSpent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Remaining</p>
              <p className={cn("text-xl font-bold", summary.net >= 0 ? "text-emerald-600" : "text-destructive/80")}>
                {formatCompactCurrency(summary.net, 'AUD', true)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">% Budget Used</p>
              <p className="text-xl font-bold">{summary.pctUsed.toFixed(0)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Budget table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">{columnLabel}</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Last Month</TableHead>
                  <TableHead className="text-right hidden md:table-cell">3-Mo Avg</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Remaining</TableHead>
                  <TableHead className="hidden lg:table-cell w-32">Progress</TableHead>
                  <TableHead className="w-10">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.category} className="group">
                    <TableCell>
                      <button
                        className="text-sm font-medium hover:text-primary transition-colors text-left"
                        onClick={() => handleCategoryClick(row.category)}
                      >
                        {row.category}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <BudgetInput row={row} onSave={handleSave} />
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCompactCurrency(row.thisMonth)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground hidden md:table-cell">
                      {formatCompactCurrency(row.lastMonth)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground hidden md:table-cell">
                      {formatCompactCurrency(row.threeMonthAvg)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right text-sm hidden sm:table-cell",
                      row.remaining === null ? "text-muted-foreground" :
                        row.remaining >= 0 ? "text-emerald-600" : "text-destructive/80"
                    )}>
                      {row.remaining !== null ? formatCompactCurrency(row.remaining, 'AUD', true) : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {row.progressPct !== null ? (
                        <div className="w-full">
                          <Progress
                            value={Math.min(row.progressPct, 100)}
                            className={cn(
                              "h-2",
                              row.progressPct > 100 ? "[&>div]:bg-destructive/70" : "[&>div]:bg-emerald-500"
                            )}
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <TrendIcon trend={row.trend} />
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No spending categories found. Import transactions first.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
