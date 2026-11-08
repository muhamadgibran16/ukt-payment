import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  GATEWAY_EVENT_TYPES,
  type GatewayEventType,
  PaymentEventType,
} from '../../invoices/enums/payment-event-type.enum';

/**
 * Payload notifikasi dari payment gateway (snake_case, konvensi gateway).
 * Dokumentasi lengkap: docs/WEBHOOK.md
 */
export class PaymentWebhookDto {
  /** ID unik event dari gateway; dipakai untuk idempotensi. @example "evt_01J9X..." */
  @IsString()
  @Length(1, 100)
  event_id!: string;

  @IsIn(GATEWAY_EVENT_TYPES)
  event_type!: GatewayEventType;

  /** @example "UCN" */
  @IsString()
  @Length(1, 20)
  institution_code!: string;

  /** @example "UKT-20261-2023001" */
  @IsString()
  @Length(1, 50)
  invoice_number!: string;

  /** ID transaksi di sisi gateway. @example "trx_8f2a..." */
  @IsOptional()
  @IsString()
  @Length(1, 100)
  transaction_id?: string;

  /** Nominal dibayar (rupiah). Wajib untuk payment.success. */
  @ValidateIf(
    (o: PaymentWebhookDto) =>
      o.event_type === PaymentEventType.PAYMENT_SUCCESS || o.amount != null,
  )
  @IsInt()
  @Min(1)
  amount?: number;

  /** @example "VA_BNI" */
  @IsOptional()
  @IsString()
  @Length(1, 50)
  payment_method?: string;

  /** Waktu kejadian di sisi gateway (ISO 8601). */
  @IsISO8601({ strict: true })
  occurred_at!: string;
}
