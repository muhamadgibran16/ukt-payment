import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { TimestampedEntity } from '../../common/entities/base.entity';
import { bigintTransformer } from '../../common/transformers/bigint.transformer';
import { Institution } from '../../institutions/entities/institution.entity';
import { User } from '../../users/entities/user.entity';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { InvoiceTransaction } from './invoice-transaction.entity';

/**
 * Tagihan UKT satu mahasiswa untuk satu semester.
 * FK dideklarasikan eksplisit dengan @ForeignKey (termasuk composite FK ke users);
 * relasi di bawah hanya untuk join, karena itu `createForeignKeyConstraints: false`.
 */
@Entity('invoices')
@ForeignKey(() => Institution, ['institutionId'], ['id'], {
  name: 'FK_invoices_institution',
  onDelete: 'RESTRICT',
})
// Mahasiswa sebuah tagihan WAJIB dari institusi yang sama (dijamin database).
@ForeignKey(
  () => User,
  ['institutionId', 'studentId'],
  ['institutionId', 'id'],
  {
    name: 'FK_invoices_student_same_institution',
    onDelete: 'RESTRICT',
  },
)
@Unique('UQ_invoices_institution_number', ['institutionId', 'invoiceNumber'])
@Unique('UQ_invoices_institution_student_semester', [
  'institutionId',
  'studentId',
  'semester',
])
@Unique('UQ_invoices_institution_id_id', ['institutionId', 'id'])
@Index('IDX_invoices_institution_status', [
  'institutionId',
  'status',
  'createdAt',
])
// Dipakai job kedaluwarsa otomatis.
@Index('IDX_invoices_unpaid_expiry', ['expiresAt'], {
  where: `"status" = 'unpaid'`,
})
@Check('CHK_invoices_amount_positive', `"amount" > 0`)
// Invarian: paid_at terisi jika dan hanya jika status = paid.
@Check(
  'CHK_invoices_paid_consistency',
  `("status" = 'paid') = ("paid_at" IS NOT NULL)`,
)
export class Invoice extends TimestampedEntity {
  @Column({ type: 'uuid', name: 'institution_id' })
  institutionId!: string;

  @Column({ type: 'uuid', name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'student_id' })
  student?: User;

  /** Nomor tagihan, unik di dalam satu institusi. @example "UKT-20261-0001" */
  @Column({ type: 'varchar', name: 'invoice_number', length: 50 })
  invoiceNumber!: string;

  /** Kode periode akademik: tahun + 1 (ganjil) / 2 (genap). @example "20261" */
  @Column({ type: 'varchar', length: 5 })
  semester!: string;

  /** Nominal dalam rupiah (tanpa desimal). */
  @Column({ type: 'bigint', transformer: bigintTransformer })
  amount!: number;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    enumName: 'invoice_status',
    default: InvoiceStatus.UNPAID,
  })
  status!: InvoiceStatus;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt!: Date | null;

  @Column({
    type: 'bigint',
    name: 'paid_amount',
    nullable: true,
    transformer: bigintTransformer,
  })
  paidAmount!: number | null;

  @OneToMany(() => InvoiceTransaction, (t) => t.invoice)
  transactions?: InvoiceTransaction[];
}
