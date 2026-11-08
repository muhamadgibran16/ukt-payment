import { TransactionSource } from '../invoices/enums/transaction-source.enum';
import {
  ApplyEventInput,
  ApplyEventResult,
} from '../invoices/invoice-payment.service';
import { WebhookLogStatus } from './domain/webhook-log-status.enum';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { WebhookLog } from './entities/webhook-log.entity';
import { WebhookAck, WebhookOutcome } from './webhook.types';

function pickString(payload: unknown, key: string, max: number): string | null {
  const value = (payload as Record<string, unknown> | null)?.[key];
  return typeof value === 'string' ? value.slice(0, max) : null;
}

export function extractAuditFields(payload: unknown): Partial<WebhookLog> {
  return {
    institutionCode: pickString(payload, 'institution_code', 50),
    eventId: pickString(payload, 'event_id', 100),
    eventType: pickString(payload, 'event_type', 40),
    invoiceNumber: pickString(payload, 'invoice_number', 50),
  };
}

export function toApplyEventInput(
  dto: PaymentWebhookDto,
  webhookLogId: string,
): ApplyEventInput {
  return {
    invoiceNumber: dto.invoice_number,
    type: dto.event_type,
    source: TransactionSource.GATEWAY,
    eventId: dto.event_id,
    gatewayTransactionId: dto.transaction_id ?? null,
    amount: dto.amount ?? null,
    paymentMethod: dto.payment_method ?? null,
    occurredAt: new Date(dto.occurred_at),
    webhookLogId,
  };
}

export function toWebhookOutcome(
  result: ApplyEventResult,
  dto: PaymentWebhookDto,
  institutionCode: string,
  webhookLogId: string,
): WebhookOutcome {
  const ack = (fields: Omit<WebhookAck, 'webhook_log_id'>): WebhookAck => ({
    ...fields,
    webhook_log_id: webhookLogId,
  });

  switch (result.kind) {
    case 'invoice_not_found': {
      const message = `Tagihan ${dto.invoice_number} tidak ditemukan di institusi ${institutionCode}`;
      return {
        ack: ack({ status: 'ignored', message }),
        logStatus: WebhookLogStatus.IGNORED,
        logMessage: message,
      };
    }
    case 'duplicate': {
      const message = `Event ${dto.event_id} sudah pernah diproses`;
      return {
        ack: ack({ status: 'duplicate', message }),
        logStatus: WebhookLogStatus.DUPLICATE,
        logMessage: message,
      };
    }
    case 'recorded':
      return {
        ack: ack({
          status: 'processed',
          invoice_status: result.statusAfter,
          outcome: result.outcome,
        }),
        logStatus: WebhookLogStatus.PROCESSED,
        logMessage: `${result.statusBefore} -> ${result.statusAfter} (${result.outcome})`,
      };
  }
}
