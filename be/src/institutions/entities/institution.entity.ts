import { Exclude } from 'class-transformer';
import { Column, Entity, Index } from 'typeorm';
import { TimestampedEntity } from '../../common/entities/base.entity';

@Entity('institutions')
export class Institution extends TimestampedEntity {
  /** Kode unik institusi, dikirim gateway di payload webhook. @example "UCN" */
  @Index('UQ_institutions_code', { unique: true })
  @Column({ type: 'varchar', length: 20 })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  /**
   * Secret HMAC-SHA256 untuk verifikasi webhook. Tidak pernah di-SELECT secara
   * default dan tidak pernah diserialisasi ke response.
   */
  @Exclude()
  @Column({
    type: 'varchar',
    name: 'webhook_secret',
    length: 255,
    select: false,
  })
  webhookSecret!: string;
}
