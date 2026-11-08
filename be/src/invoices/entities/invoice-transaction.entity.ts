import {
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { bigintTransformer } from '../../common/transformers/bigint.transformer';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { TransactionOutcome } from '../enums/transaction-outcome.enum';
import { TransactionSource } from '../enums/transaction-source.enum';
import { WebhookLog } from '../../webhooks/entities/webhook-log.entity';
import { Invoice } from './invoice.entity';

/**
 * Riwayat transaksi tagihan (append-only). Setiap event yang menyentuh tagihan
 * dicatat di sini, termasuk yang tidak mengubah status (outcome != applied).
 */
@Entity('invoice_transactions')
// Transaksi hanya bisa menunjuk tagihan dari institusi yang sama.
@ForeignKey(
  () => Invoice,
  ['institutionId', 'invoiceId'],
  ['institutionId', 'id'],
  {
    name: 'FK_invoice_transactions_invoice_same_institution',
    onDelete: 'RESTRICT',
  },
)
@ForeignKey(() => WebhookLog, ['webhookLogId'], ['id'], {
  name: 'FK_invoice_transactions_webhook_log',
  onDelete: 'SET NULL',
})
@Index('IDX_invoice_transactions_invoice', [
  'institutionId',
  'invoiceId',
  'createdAt',
])
// Kunci idempotensi webhook: satu event gateway hanya boleh diproses sekali per institusi.
@Index('UQ_invoice_transactions_event', ['institutionId', 'eventId'], {
  unique: true,
  where: `"event_id" IS NOT NULL`,
})
export class InvoiceTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'institution_id' })
  institutionId!: string;

  @Column({ type: 'uuid', name: 'invoice_id' })
  invoiceId!: string;

  @ManyToOne(() => Invoice, (i) => i.transactions, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: Invoice;

  @Column({
    type: 'enum',
    enum: TransactionSource,
    enumName: 'transaction_source',
  })
  source!: TransactionSource;

  /**
   * ID event dari gateway. Unik per institusi (partial unique index di migration)
   * dan menjadi kunci idempotensi webhook.
   */
  @Column({ type: 'varchar', name: 'event_id', length: 100, nullable: true })
  eventId!: string | null;

  @Column({ type: 'varchar', name: 'event_type', length: 40 })
  eventType!: string;

  @Column({
    type: 'varchar',
    name: 'gateway_transaction_id',
    length: 100,
    nullable: true,
  })
  gatewayTransactionId!: string | null;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: bigintTransformer,
  })
  amount!: number | null;

  @Column({
    type: 'varchar',
    name: 'payment_method',
    length: 50,
    nullable: true,
  })
  paymentMethod!: string | null;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    enumName: 'invoice_status',
    name: 'status_before',
  })
  statusBefore!: InvoiceStatus;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    enumName: 'invoice_status',
    name: 'status_after',
  })
  statusAfter!: InvoiceStatus;

  @Column({
    type: 'enum',
    enum: TransactionOutcome,
    enumName: 'transaction_outcome',
  })
  outcome!: TransactionOutcome;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  /** Waktu kejadian menurut sumber event (bukan waktu diterima). */
  @Column({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt!: Date;

  @Column({ type: 'uuid', name: 'webhook_log_id', nullable: true })
  webhookLogId!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
