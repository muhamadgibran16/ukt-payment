import { InvoiceStatus } from '../invoices/enums/invoice-status.enum';
import { TransactionOutcome } from '../invoices/enums/transaction-outcome.enum';
import { WebhookLogStatus } from './domain/webhook-log-status.enum';

export interface WebhookRequest {
  rawBody: Buffer | undefined;
  signature: string | undefined;
  sourceIp: string | undefined;
}

export interface WebhookAck {
  status: 'processed' | 'duplicate' | 'ignored';
  webhook_log_id: string;
  invoice_status?: InvoiceStatus;
  outcome?: TransactionOutcome;
  message?: string;
}

export interface WebhookOutcome {
  ack: WebhookAck;
  logStatus: WebhookLogStatus;
  logMessage: string;
}
