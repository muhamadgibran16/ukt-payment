import type { User } from '@/features/auth/types';

export type InvoiceStatus = 'unpaid' | 'paid' | 'expired';
export type TransactionOutcome =
  'applied' | 'applied_late' | 'amount_mismatch' | 'double_payment' | 'ignored';

export interface InvoiceTransaction {
  id: string;
  invoiceId: string;
  source: 'gateway' | 'system';
  eventId: string | null;
  eventType: string;
  gatewayTransactionId: string | null;
  amount: number | null;
  paymentMethod: string | null;
  statusBefore: InvoiceStatus;
  statusAfter: InvoiceStatus;
  outcome: TransactionOutcome;
  note: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  institutionId: string;
  studentId: string;
  student?: User;
  invoiceNumber: string;
  semester: string;
  amount: number;
  expiresAt: string;
  status: InvoiceStatus;
  paidAt: string | null;
  paidAmount: number | null;
  createdAt: string;
  updatedAt: string;
  transactions?: InvoiceTransaction[];
}

export type InvoiceSummary = Record<InvoiceStatus, { count: number; amount: number }>;

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  semester?: string;
  search?: string;
}

export interface CreateInvoiceInput {
  studentId: string;
  semester: string;
  invoiceNumber?: string;
  amount: number;
  expiresAt: string;
}
