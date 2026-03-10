import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CategoryBadge } from '@/components/transactions/CategoryBadge';
import { TransferLinkBadge } from '@/components/transactions/TransferLinkBadge';
import { formatCompactCurrency } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TransactionFields {
  id: string;
  transaction_date: string;
  effective_date?: string | null;
  description: string | null;
  counterparty?: string | null;
  amount_native: number;
  amount_aud: number;
  currency: string;
  l1_category: string | null;
  l2_category: string | null;
  source_account_name: string | null;
  transaction_type: string;
  is_internal_transfer: boolean;
  needs_review: boolean;
  is_synthetic?: boolean;
}

interface TransactionDetailModalProps {
  transaction: TransactionFields | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOptimisticUpdate?: (txId: string, newL1: string, isTransfer: boolean) => void;
  onUpdate?: () => void;
  linkedAccount?: string | null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 w-32">{label}</span>
      <span className="text-sm text-right">{children}</span>
    </div>
  );
}

export function TransactionDetailModal({
  transaction,
  open,
  onOpenChange,
  onOptimisticUpdate,
  onUpdate,
  linkedAccount,
}: TransactionDetailModalProps) {
  const [accrualDate, setAccrualDate] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Sync local state when transaction changes
  const t = transaction;
  const currentEffectiveDate = t?.effective_date ? new Date(t.effective_date) : undefined;

  const handleAccrualDateChange = async (date: Date | undefined) => {
    if (!t) return;
    setAccrualDate(date);
    setSaving(true);

    const { error } = await supabase
      .from('transactions')
      .update({ effective_date: date ? format(date, 'yyyy-MM-dd') : null })
      .eq('id', t.id);

    setSaving(false);
    if (error) {
      toast({ title: 'Failed to update accrual date', variant: 'destructive' });
    } else {
      toast({ title: date ? `Accrual date set to ${format(date, 'MMM d, yyyy')}` : 'Accrual date cleared' });
    }
  };

  const clearAccrualDate = async () => {
    await handleAccrualDateChange(undefined);
  };

  if (!t) return null;

  const displayAccrualDate = accrualDate !== undefined ? accrualDate : currentEffectiveDate;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setAccrualDate(undefined); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Transaction Detail</DialogTitle>
        </DialogHeader>
        <div className="space-y-0">
          <Row label="Date">{format(new Date(t.transaction_date), 'MMM d, yyyy')}</Row>
          <Row label="Account">{t.source_account_name ?? '—'}</Row>
          {t.counterparty && <Row label="Counterparty">{t.counterparty}</Row>}
          <Row label="Description">{t.description ?? '—'}</Row>
          <Row label="Amount (Native)">
            {t.currency !== 'AUD' ? `${t.currency} ${t.amount_native.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
          </Row>
          <Row label="Amount (AUD)">
            <span className={t.amount_aud >= 0 ? 'text-green-600' : 'text-destructive'}>
              {formatCompactCurrency(Math.abs(t.amount_aud))}
            </span>
          </Row>
          <Row label="Currency">{t.currency}</Row>
          <Row label="Category">
            <CategoryBadge
              transactionId={t.id}
              currentL1={t.l1_category}
              currentL2={t.l2_category}
              description={t.description}
              onOptimisticUpdate={onOptimisticUpdate}
              onUpdate={onUpdate ?? (() => {})}
            />
          </Row>

          {/* Accrual Date picker */}
          <div className="flex items-start justify-between py-2 border-b border-border/50">
            <div className="shrink-0 w-32">
              <span className="text-xs text-muted-foreground">Accrual Date</span>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">Overrides display date in Accrual view</p>
            </div>
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs justify-start",
                      !displayAccrualDate && "text-muted-foreground"
                    )}
                    disabled={saving}
                  >
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {displayAccrualDate ? format(displayAccrualDate, 'MMM d, yyyy') : 'Set date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={displayAccrualDate}
                    onSelect={(d) => d && handleAccrualDateChange(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {displayAccrualDate && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={clearAccrualDate} disabled={saving}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <Row label="Type">
            <Badge variant="outline" className="text-xs">{t.transaction_type}</Badge>
          </Row>
          <Row label="Internal Transfer">
            {t.is_internal_transfer ? (
              <Badge variant="outline" className="text-xs text-muted-foreground">Yes</Badge>
            ) : 'No'}
          </Row>
          {t.is_synthetic !== undefined && (
            <Row label="Synthetic">{t.is_synthetic ? 'Yes' : 'No'}</Row>
          )}
          <Row label="Needs Review">{t.needs_review ? 'Yes' : 'No'}</Row>
          {linkedAccount && (
            <Row label="Linked Transfer">
              <TransferLinkBadge
                transaction={{
                  id: t.id,
                  transaction_date: t.transaction_date,
                  amount_aud: t.amount_aud,
                  source_account_name: t.source_account_name,
                  is_internal_transfer: t.is_internal_transfer,
                  counterparty: t.counterparty ?? null,
                  description: t.description,
                }}
                linkedAccount={linkedAccount}
              />
            </Row>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
