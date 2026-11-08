import { Exclude } from 'class-transformer';
import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { TimestampedEntity } from '../../common/entities/base.entity';
import { Institution } from '../../institutions/entities/institution.entity';
import { Role } from '../enums/role.enum';

@Entity('users')
@ForeignKey(() => Institution, ['institutionId'], ['id'], {
  name: 'FK_users_institution',
  onDelete: 'RESTRICT',
})
// Target composite FK dari invoices(institution_id, student_id): menjamin di level
// database bahwa mahasiswa sebuah tagihan berasal dari institusi yang sama.
@Unique('UQ_users_institution_id_id', ['institutionId', 'id'])
@Unique('UQ_users_institution_nim', ['institutionId', 'nim'])
@Check('CHK_users_student_nim', `"role" <> 'student' OR "nim" IS NOT NULL`)
export class User extends TimestampedEntity {
  @Index('IDX_users_institution_id')
  @Column({ type: 'uuid', name: 'institution_id' })
  institutionId!: string;

  // FK dideklarasikan lewat @ForeignKey di atas class.
  @ManyToOne(() => Institution, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'institution_id' })
  institution?: Institution;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /** Email unik global karena dipakai untuk login. */
  @Index('UQ_users_email', { unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  /** Nomor Induk Mahasiswa. Hanya untuk role student, unik per institusi. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  nim!: string | null;

  @Exclude()
  @Column({ type: 'varchar', select: false })
  password!: string;

  @Column({ type: 'enum', enum: Role, enumName: 'user_role' })
  role!: Role;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;
}
