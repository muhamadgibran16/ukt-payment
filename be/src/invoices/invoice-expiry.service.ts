import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, LessThan } from 'typeorm';
import { AppConfig } from '../config/configuration';
import { Invoice } from './entities/invoice.entity';
import { InvoiceStatus } from './enums/invoice-status.enum';
import { PaymentEventType } from './enums/payment-event-type.enum';
import { TransactionSource } from './enums/transaction-source.enum';
import { InvoicePaymentService } from './invoice-payment.service';

const BATCH_SIZE = 200;

/**
 * Menandai tagihan `unpaid` yang melewati expires_at sebagai `expired`,
 * untuk berjaga-jaga jika gateway tidak pernah mengirim payment.expired.
 *
 * Ini SATU-SATUNYA query lintas institusi yang disengaja (job sistem).
 * Setiap tagihan tetap diproses lewat applyEvent dengan institution_id-nya
 * sendiri, sehingga lock + state machine yang sama berlaku: jika di saat yang
 * sama pembayaran masuk, status akhir tetap konsisten.
 */
@Injectable()
export class InvoiceExpiryService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(InvoiceExpiryService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly payments: InvoicePaymentService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  onApplicationBootstrap() {
    const interval = this.config.get('expirySweepIntervalMs', { infer: true });
    if (interval > 0) {
      this.timer = setInterval(() => void this.sweep(), interval);
      this.timer.unref();
    }
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep(now: Date = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let expired = 0;
    try {
      const overdue = await this.dataSource.getRepository(Invoice).find({
        select: { id: true, institutionId: true, invoiceNumber: true },
        where: { status: InvoiceStatus.UNPAID, expiresAt: LessThan(now) },
        order: { expiresAt: 'ASC' },
        take: BATCH_SIZE,
      });
      for (const inv of overdue) {
        const result = await this.payments.applyEvent(inv.institutionId, {
          invoiceNumber: inv.invoiceNumber,
          type: PaymentEventType.SYSTEM_EXPIRED,
          source: TransactionSource.SYSTEM,
          eventId: null,
          occurredAt: now,
        });
        if (
          result.kind === 'recorded' &&
          result.statusAfter === InvoiceStatus.EXPIRED
        ) {
          expired++;
        }
      }
      if (expired > 0)
        this.logger.log(`${expired} tagihan ditandai kedaluwarsa`);
    } catch (error) {
      this.logger.error('Gagal menjalankan job kedaluwarsa', error);
    } finally {
      this.running = false;
    }
    return expired;
  }
}
