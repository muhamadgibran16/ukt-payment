import {
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Institution } from '../../institutions/entities/institution.entity';
import { WebhookLogStatus } from '../domain/webhook-log-status.enum';

/**
 * Audit log SELURUH notifikasi yang diterima endpoint webhook, termasuk yang
 * ditolak (signature salah, institusi tidak dikenal, payload rusak).
 * Baris dibuat SEBELUM validasi apa pun, lalu di-update dengan hasilnya.
 */
@Entity('webhook_logs')
@ForeignKey(() => Institution, ['institutionId'], ['id'], {
  name: 'FK_webhook_logs_institution',
  onDelete: 'RESTRICT',
})
@Index('IDX_webhook_logs_institution', ['institutionId', 'receivedAt'])
@Index('IDX_webhook_logs_event', ['institutionCode', 'eventId'])
export class WebhookLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'received_at' })
  receivedAt!: Date;

  /** Kode institusi seperti yang dikirim (belum tentu valid). */
  @Column({
    type: 'varchar',
    name: 'institution_code',
    length: 50,
    nullable: true,
  })
  institutionCode!: string | null;

  @Column({ type: 'uuid', name: 'institution_id', nullable: true })
  institutionId!: string | null;

  @Column({ type: 'varchar', name: 'event_id', length: 100, nullable: true })
  eventId!: string | null;

  @Column({ type: 'varchar', name: 'event_type', length: 40, nullable: true })
  eventType!: string | null;

  @Column({
    type: 'varchar',
    name: 'invoice_number',
    length: 50,
    nullable: true,
  })
  invoiceNumber!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  signature!: string | null;

  @Column({ type: 'boolean', name: 'signature_valid', default: false })
  signatureValid!: boolean;

  /** Body mentah persis seperti diterima (dasar perhitungan HMAC). */
  @Column({ type: 'text', name: 'raw_body' })
  rawBody!: string;

  @Column({ type: 'varchar', name: 'source_ip', length: 64, nullable: true })
  sourceIp!: string | null;

  @Column({
    type: 'enum',
    enum: WebhookLogStatus,
    enumName: 'webhook_log_status',
    name: 'processing_status',
    default: WebhookLogStatus.RECEIVED,
  })
  processingStatus!: WebhookLogStatus;

  @Column({ type: 'int', name: 'response_code', nullable: true })
  responseCode!: number | null;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'timestamptz', name: 'processed_at', nullable: true })
  processedAt!: Date | null;
}
