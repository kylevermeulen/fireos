import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from '@/components/transactions/CategoryBadge';
import { TransferLinkBadge } from '@/components/transactions/TransferLinkBadge';
import { formatCompactCurrency } from '@/lib/format';

interface TransactionFields {
  id: string;
  transaction_date: string;
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
  if (!transaction) return null;

  const t = transaction;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onOptimisticUpdate={onOptimisticUpdate}
              onUpdate={onUpdate ?? (() => {})}
            />
          </Row>
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
