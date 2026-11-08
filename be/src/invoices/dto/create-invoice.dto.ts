import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateInvoiceDto {
  /** ID mahasiswa (harus dari institusi yang sama dengan admin). */
  @IsUUID()
  studentId!: string;

  /** Kode periode: tahun + 1 (ganjil) / 2 (genap). @example "20261" */
  @Matches(/^\d{4}[12]$/, {
    message:
      'semester harus berformat YYYYS, mis. 20261 (ganjil) atau 20262 (genap)',
  })
  semester!: string;

  /**
   * Opsional. Jika kosong dibuat otomatis: UKT-{semester}-{nim}.
   * @example "UKT-20261-2023001"
   */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() || undefined : value,
  )
  @Matches(/^[A-Z0-9][A-Z0-9-]{2,49}$/, {
    message:
      'invoiceNumber hanya boleh huruf, angka, dan tanda hubung (3-50 karakter)',
  })
  invoiceNumber?: string;

  /** Nominal UKT dalam rupiah. @example 4500000 */
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  amount!: number;

  /** Batas waktu pembayaran (ISO 8601). @example "2026-12-31T23:59:59+07:00" */
  @Type(() => Date)
  @IsDate()
  expiresAt!: Date;
}
