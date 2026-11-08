import type { BadgeTone } from '@/components/ui/badge';
import type { InvoiceStatus, InvoiceTransaction, TransactionOutcome } from './types';

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  unpaid: { label: 'Belum bayar', tone: 'amber' },
  paid: { label: 'Lunas', tone: 'green' },
  expired: { label: 'Kedaluwarsa', tone: 'red' },
};

export const TRANSACTION_OUTCOME: Record<TransactionOutcome, { label: string; tone: BadgeTone }> = {
  applied: { label: 'Diterapkan', tone: 'green' },
  applied_late: { label: 'Diterapkan (terlambat)', tone: 'blue' },
  amount_mismatch: { label: 'Nominal tidak cocok', tone: 'red' },
  double_payment: { label: 'Pembayaran ganda', tone: 'violet' },
  ignored: { label: 'Diabaikan', tone: 'slate' },
};

const EVENT_LABEL: Record<string, string> = {
  'payment.success': 'Pembayaran berhasil',
  'payment.expired': 'Kedaluwarsa (gateway)',
  'system.expired': 'Kedaluwarsa (sistem)',
};

export const eventLabel = (eventType: string) => EVENT_LABEL[eventType] ?? eventType;

export const transactionChannel = (t: InvoiceTransaction) =>
  t.paymentMethod ?? (t.source === 'system' ? 'Sistem' : '-');
