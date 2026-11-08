import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { uniqueViolationConstraint } from '../common/database/pg-errors';
import {
  decideTransition,
  TransitionDecision,
} from './domain/invoice-state-machine';
import { InvoiceTransaction } from './entities/invoice-transaction.entity';
import { Invoice } from './entities/invoice.entity';
import { InvoiceStatus } from './enums/invoice-status.enum';
import { PaymentEventType } from './enums/payment-event-type.enum';
import { TransactionOutcome } from './enums/transaction-outcome.enum';
import { TransactionSource } from './enums/transaction-source.enum';

export interface ApplyEventInput {
  invoiceNumber: string;
  type: PaymentEventType;
  source: TransactionSource;
  /** ID event gateway; kunci idempotensi. Null untuk event sistem. */
  eventId: string | null;
  gatewayTransactionId?: string | null;
  amount?: number | null;
  paymentMethod?: string | null;
  occurredAt: Date;
  webhookLogId?: string | null;
}

export type ApplyEventResult =
  | {
      kind: 'recorded';
      invoiceId: string;
      transactionId: string;
      outcome: TransactionOutcome;
      statusBefore: InvoiceStatus;
      statusAfter: InvoiceStatus;
    }
  | { kind: 'duplicate'; invoiceId: string | null }
  | { kind: 'invoice_not_found' };

const EVENT_UNIQUE_CONSTRAINT = 'UQ_invoice_transactions_event';

const NEEDS_RECONCILIATION = new Set([
  TransactionOutcome.AMOUNT_MISMATCH,
  TransactionOutcome.DOUBLE_PAYMENT,
]);

/**
 * Menerapkan satu event pembayaran ke tagihan secara atomik.
 *
 * Kenapa aman terhadap webhook ganda / bersamaan / tidak berurutan:
 * 1. Baris tagihan dikunci `SELECT ... FOR UPDATE`, sehingga event untuk
 *    tagihan yang sama diproses bergantian (serial), tidak balapan.
 * 2. Setelah memegang lock, cek apakah event_id sudah pernah dicatat
 *    (idempotensi). Unique index (institution_id, event_id) jadi pengaman
 *    terakhir jika ada jalur lain yang lolos.
 * 3. Keputusan status diambil oleh `decideTransition` (pure function) dari
 *    status TERKINI hasil lock, bukan dari data yang dibaca sebelumnya.
 */
@Injectable()
export class InvoicePaymentService {
  private readonly logger = new Logger(InvoicePaymentService.name);

  constructor(private readonly dataSource: DataSource) {}

  async applyEvent(
    institutionId: string,
    input: ApplyEventInput,
  ): Promise<ApplyEventResult> {
    try {
      return await this.dataSource.transaction((manager) =>
        this.applyInTransaction(manager, institutionId, input),
      );
    } catch (error) {
      // Event yang sama untuk nomor tagihan berbeda tertahan di unique index.
      if (uniqueViolationConstraint(error) === EVENT_UNIQUE_CONSTRAINT) {
        return { kind: 'duplicate', invoiceId: null };
      }
      throw error;
    }
  }

  private async applyInTransaction(
    manager: EntityManager,
    institutionId: string,
    input: ApplyEventInput,
  ): Promise<ApplyEventResult> {
    const invoice = await this.lockInvoice(
      manager,
      institutionId,
      input.invoiceNumber,
    );
    if (!invoice) return { kind: 'invoice_not_found' };

    if (await this.isProcessed(manager, institutionId, input.eventId)) {
      return { kind: 'duplicate', invoiceId: invoice.id };
    }

    const decision = decideTransition(invoice, {
      type: input.type,
      amount: input.amount ?? null,
      occurredAt: input.occurredAt,
    });
    const transaction = await this.recordTransaction(
      manager,
      invoice,
      input,
      decision,
    );
    await this.updateInvoiceStatus(manager, invoice, decision);
    this.warnIfNeedsReconciliation(invoice, input, decision);

    return {
      kind: 'recorded',
      invoiceId: invoice.id,
      transactionId: transaction.id,
      outcome: decision.outcome,
      statusBefore: invoice.status,
      statusAfter: decision.nextStatus,
    };
  }

  private lockInvoice(
    manager: EntityManager,
    institutionId: string,
    invoiceNumber: string,
  ): Promise<Invoice | null> {
    return manager.findOne(Invoice, {
      where: { institutionId, invoiceNumber },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private async isProcessed(
    manager: EntityManager,
    institutionId: string,
    eventId: string | null,
  ): Promise<boolean> {
    if (!eventId) return false; // event sistem tidak punya event_id
    return manager.exists(InvoiceTransaction, {
      where: { institutionId, eventId },
    });
  }

  private recordTransaction(
    manager: EntityManager,
    invoice: Invoice,
    input: ApplyEventInput,
    decision: TransitionDecision,
  ): Promise<InvoiceTransaction> {
    return manager.save(
      manager.create(InvoiceTransaction, {
        institutionId: invoice.institutionId,
        invoiceId: invoice.id,
        source: input.source,
        eventId: input.eventId,
        eventType: input.type,
        gatewayTransactionId: input.gatewayTransactionId ?? null,
        amount: input.amount ?? null,
        paymentMethod: input.paymentMethod ?? null,
        statusBefore: invoice.status,
        statusAfter: decision.nextStatus,
        outcome: decision.outcome,
        note: decision.note,
        occurredAt: input.occurredAt,
        webhookLogId: input.webhookLogId ?? null,
      }),
    );
  }

  /** update() eksplisit (bukan save()) agar hanya kolom status yang ditulis. */
  private async updateInvoiceStatus(
    manager: EntityManager,
    invoice: Invoice,
    decision: TransitionDecision,
  ): Promise<void> {
    if (decision.nextStatus === invoice.status) return;
    await manager.update(
      Invoice,
      { id: invoice.id, institutionId: invoice.institutionId },
      {
        status: decision.nextStatus,
        paidAt: decision.paidAt ?? null,
        paidAmount: decision.paidAmount ?? null,
      },
    );
  }

  private warnIfNeedsReconciliation(
    invoice: Invoice,
    input: ApplyEventInput,
    decision: TransitionDecision,
  ): void {
    if (!NEEDS_RECONCILIATION.has(decision.outcome)) return;
    this.logger.warn(
      `Perlu rekonsiliasi: ${decision.outcome} invoice=${invoice.invoiceNumber} institution=${invoice.institutionId} event=${input.eventId}`,
    );
  }
}
