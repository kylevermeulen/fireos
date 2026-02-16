import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddHolding, useUpdateHolding, type Holding } from '@/hooks/useHoldings';
import { toast } from 'sonner';

interface HoldingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountCurrency: 'AUD' | 'USD' | 'IDR';
  holding?: Holding | null;
}

export function HoldingFormDialog({ open, onOpenChange, accountId, accountCurrency, holding }: HoldingFormDialogProps) {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costBasis, setCostBasis] = useState('');

  const addHolding = useAddHolding();
  const updateHolding = useUpdateHolding();

  useEffect(() => {
    if (holding) {
      setSymbol(holding.symbol);
      setName(holding.name || '');
      setQuantity(String(holding.quantity));
      setCostBasis(String(holding.cost_basis_native || ''));
    } else {
      setSymbol('');
      setName('');
      setQuantity('');
      setCostBasis('');
    }
  }, [holding, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const qty = parseFloat(quantity);
    const cost = parseFloat(costBasis) || 0;
    
    if (!symbol.trim() || isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid symbol and quantity');
      return;
    }

    try {
      if (holding) {
        await updateHolding.mutateAsync({
          id: holding.id,
          symbol: symbol.trim().toUpperCase(),
          name: name.trim() || undefined,
          quantity: qty,
          cost_basis_native: cost,
          cost_basis_aud: accountCurrency === 'AUD' ? cost : undefined,
        });
        toast.success('Holding updated');
      } else {
        await addHolding.mutateAsync({
          account_id: accountId,
          symbol: symbol.trim().toUpperCase(),
          name: name.trim() || undefined,
          quantity: qty,
          cost_basis_native: cost,
          cost_basis_aud: accountCurrency === 'AUD' ? cost : undefined,
        });
        toast.success('Holding added');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save holding');
    }
  };

  const isSubmitting = addHolding.isPending || updateHolding.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{holding ? 'Edit Holding' : 'Add Holding'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol / Ticker</Label>
              <Input
                id="symbol"
                placeholder="e.g. VAS.AX, AAPL"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                placeholder="e.g. Vanguard Aus Shares"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Shares / Units</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costBasis">Cost Basis ({accountCurrency})</Label>
              <Input
                id="costBasis"
                type="number"
                step="any"
                min="0"
                placeholder="Total purchase cost"
                value={costBasis}
                onChange={(e) => setCostBasis(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Use Yahoo Finance ticker format: ASX stocks end with .AX (e.g. VAS.AX), US stocks use standard tickers (e.g. AAPL), crypto uses Symbol-USD (e.g. BTC-USD).
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : holding ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
