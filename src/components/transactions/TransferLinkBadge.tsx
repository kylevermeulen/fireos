import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeftRight } from 'lucide-react';

interface Transaction {
  id: string;
  transaction_date: string;
  amount_aud: number;
  source_account_name: string | null;
  is_internal_transfer: boolean;
  counterparty: string | null;
  description: string | null;
}

interface TransferLinkBadgeProps {
  transaction: Transaction;
  linkedAccount: string | null;
}

/**
 * Shows a linked transfer indicator when a matching counter-transaction exists.
 */
export function TransferLinkBadge({ transaction, linkedAccount }: TransferLinkBadgeProps) {
  if (!linkedAccount) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="border-blue-500/30 text-blue-600 text-xs gap-1 cursor-help">
          <ArrowLeftRight className="h-3 w-3" />
          Linked
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p>Matched transfer with <strong>{linkedAccount}</strong></p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Build a lookup map of transaction ID → linked account name.
 * Matches transfers by: same absolute amount, opposite sign, within 3 days, different account.
 */
export function buildTransferLinks(transactions: Transaction[]): Map<string, string> {
  const links = new Map<string, string>();
  const transfers = transactions.filter(t => t.is_internal_transfer);

  for (let i = 0; i < transfers.length; i++) {
    if (links.has(transfers[i].id)) continue;
    const a = transfers[i];
    const aDate = new Date(a.transaction_date).getTime();
    const aAbs = Math.round(Math.abs(a.amount_aud) * 100);

    for (let j = i + 1; j < transfers.length; j++) {
      if (links.has(transfers[j].id)) continue;
      const b = transfers[j];

      // Different accounts
      if (a.source_account_name === b.source_account_name) continue;

      // Same absolute amount
      const bAbs = Math.round(Math.abs(b.amount_aud) * 100);
      if (aAbs !== bAbs) continue;

      // Opposite signs
      if (Math.sign(a.amount_aud) === Math.sign(b.amount_aud)) continue;

      // Within 3 days
      const bDate = new Date(b.transaction_date).getTime();
      if (Math.abs(aDate - bDate) > 3 * 86400000) continue;

      // Match found
      links.set(a.id, b.source_account_name ?? 'Unknown');
      links.set(b.id, a.source_account_name ?? 'Unknown');
      break;
    }
  }

  return links;
}
