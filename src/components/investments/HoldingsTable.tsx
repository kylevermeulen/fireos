import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { useHoldings, useLatestPrices, useDeleteHolding, useRefreshPrices, type Holding, type Price } from '@/hooks/useHoldings';
import { HoldingFormDialog } from './HoldingFormDialog';
import { formatCompactCurrency, formatPercent } from '@/lib/format';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface HoldingsTableProps {
  accountId: string;
  accountName: string;
  accountCurrency: 'AUD' | 'USD' | 'IDR';
}

export function HoldingsTable({ accountId, accountName, accountCurrency }: HoldingsTableProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);

  const { data: holdings, isLoading: holdingsLoading } = useHoldings(accountId);
  const { data: priceMap, isLoading: pricesLoading } = useLatestPrices();
  const deleteHolding = useDeleteHolding();
  const refreshPrices = useRefreshPrices();

  const isLoading = holdingsLoading || pricesLoading;

  const handleEdit = (holding: Holding) => {
    setEditingHolding(holding);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingHolding(null);
    setFormOpen(true);
  };

  const handleDelete = async (id: string, symbol: string) => {
    if (!confirm(`Remove ${symbol} from this account?`)) return;
    try {
      await deleteHolding.mutateAsync(id);
      toast.success(`${symbol} removed`);
    } catch {
      toast.error('Failed to remove holding');
    }
  };

  const handleRefreshPrices = async () => {
    if (!holdings || holdings.length === 0) return;
    const symbols = [...new Set(holdings.map(h => h.symbol))];
    try {
      const result = await refreshPrices.mutateAsync(symbols);
      const fetched = result?.fetched?.length || 0;
      const errors = result?.errors?.length || 0;
      toast.success(`Prices updated for ${fetched} symbols${errors > 0 ? `, ${errors} failed` : ''}`);
    } catch {
      toast.error('Failed to refresh prices');
    }
  };

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  const rows = (holdings || []).map(h => {
    const latestPrice = priceMap?.get(h.symbol);
    const currentPrice = latestPrice?.price || 0;
    const currentValue = h.quantity * currentPrice;
    const costBasis = h.cost_basis_native || 0;
    const gainLoss = costBasis > 0 ? currentValue - costBasis : 0;
    const gainLossPercent = costBasis > 0 ? gainLoss / costBasis : 0;
    const priceDate = latestPrice?.price_date || null;

    return {
      holding: h,
      currentPrice,
      currentValue,
      costBasis,
      gainLoss,
      gainLossPercent,
      priceDate,
      priceCurrency: latestPrice?.currency || accountCurrency,
    };
  });

  const totalValue = rows.reduce((sum, r) => sum + r.currentValue, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.costBasis, 0);
  const totalGainLoss = totalCost > 0 ? totalValue - totalCost : 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{accountName} Holdings</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {holdings?.length || 0} holdings
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshPrices}
                disabled={refreshPrices.isPending || !holdings?.length}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshPrices.isPending ? 'animate-spin' : ''}`} />
                {refreshPrices.isPending ? 'Fetching...' : 'Refresh Prices'}
              </Button>
              <Button size="sm" onClick={handleAdd}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">No holdings tracked yet</p>
              <Button variant="outline" size="sm" onClick={handleAdd}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add your first holding
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Cost Basis</TableHead>
                    <TableHead className="text-right">Gain/Loss</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ holding: h, currentPrice, currentValue, costBasis, gainLoss, gainLossPercent, priceDate }) => {
                    const isPositive = gainLoss >= 0;
                    return (
                      <TableRow key={h.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{h.symbol}</span>
                            {h.name && (
                              <span className="block text-xs text-muted-foreground">{h.name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {h.quantity.toLocaleString('en-AU', { maximumFractionDigits: 4 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <span className="font-medium">${currentPrice.toFixed(2)}</span>
                            {priceDate && (
                              <span className="block text-xs text-muted-foreground">{priceDate}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCompactCurrency(currentValue, accountCurrency)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {costBasis > 0 ? formatCompactCurrency(costBasis, accountCurrency) : '—'}
                        </TableCell>
                        <TableCell className={`text-right ${isPositive ? 'text-success' : 'text-destructive'}`}>
                          {costBasis > 0 ? (
                            <div>
                              <span>{isPositive ? '+' : ''}{formatCompactCurrency(gainLoss, accountCurrency)}</span>
                              <span className="block text-xs">
                                {isPositive ? '+' : ''}{formatPercent(gainLossPercent)}
                              </span>
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(h)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(h.id, h.symbol)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {/* Totals row */}
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30 rounded-b-lg mt-2">
                <span className="text-sm font-medium">Total</span>
                <div className="flex items-center gap-6 text-sm">
                  <span className="font-medium">{formatCompactCurrency(totalValue, accountCurrency)}</span>
                  {totalCost > 0 && (
                    <span className={totalGainLoss >= 0 ? 'text-success' : 'text-destructive'}>
                      {totalGainLoss >= 0 ? '+' : ''}{formatCompactCurrency(totalGainLoss, accountCurrency)}
                      {' '}({totalGainLoss >= 0 ? '+' : ''}{formatPercent(totalCost > 0 ? totalGainLoss / totalCost : 0)})
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <HoldingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        accountId={accountId}
        accountCurrency={accountCurrency}
        holding={editingHolding}
      />
    </>
  );
}
