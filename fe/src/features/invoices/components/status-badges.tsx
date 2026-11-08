import { Badge } from '@/components/ui/badge';
import { INVOICE_STATUS, TRANSACTION_OUTCOME } from '../constants';
import type { InvoiceStatus, TransactionOutcome } from '../types';

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const s = INVOICE_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function OutcomeBadge({ outcome }: { outcome: TransactionOutcome }) {
  const o = TRANSACTION_OUTCOME[outcome];
  return <Badge tone={o.tone}>{o.label}</Badge>;
}
