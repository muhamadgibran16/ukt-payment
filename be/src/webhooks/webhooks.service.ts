import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Institution } from '../institutions/entities/institution.entity';
import { InstitutionsRepository } from '../institutions/institutions.repository';
import { InvoicePaymentService } from '../invoices/invoice-payment.service';
import { verifySignature } from './domain/signature';
import { WebhookLogStatus } from './domain/webhook-log-status.enum';
import { WebhookRejection } from './domain/webhook-rejection';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import {
  extractAuditFields,
  toApplyEventInput,
  toWebhookOutcome,
} from './webhook.mapper';
import { WebhookAck, WebhookOutcome, WebhookRequest } from './webhook.types';
import { WebhookLogsRepository } from './webhook-logs.repository';

/** Pesan sama untuk signature salah & institusi tidak dikenal: kode institusi tidak bisa ditebak. */
const INVALID_SIGNATURE = 'Invalid signature';

/**
 * Body mentah selalu dicatat ke webhook_logs SEBELUM validasi.
 * Kode respons (gateway me-retry jika bukan 2xx):
 *   200 processed/duplicate/ignored · 400 payload rusak · 401 signature/institusi
 *   tidak valid · 500 error tak terduga (aman di-retry, transaksi di-rollback).
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly logs: WebhookLogsRepository,
    private readonly institutions: InstitutionsRepository,
    private readonly payments: InvoicePaymentService,
  ) {}

  async handle(req: WebhookRequest): Promise<WebhookAck> {
    const rawBody = req.rawBody ?? Buffer.alloc(0);
    const log = await this.logs.createReceived({
      rawBody: rawBody.toString('utf8'),
      signature: req.signature?.slice(0, 200) ?? null,
      sourceIp: req.sourceIp?.slice(0, 64) ?? null,
    });

    try {
      const outcome = await this.process(log.id, rawBody, req.signature);
      await this.logs.complete(log.id, {
        status: outcome.logStatus,
        responseCode: HttpStatus.OK,
        message: outcome.logMessage,
      });
      return outcome.ack;
    } catch (error) {
      if (error instanceof WebhookRejection) {
        await this.logs.complete(log.id, {
          status: WebhookLogStatus.REJECTED,
          responseCode: error.response.getStatus(),
          message: error.reason,
        });
        throw error.response;
      }
      await this.logs.complete(log.id, {
        status: WebhookLogStatus.FAILED,
        responseCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async process(
    logId: string,
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<WebhookOutcome> {
    const payload = this.parseJson(rawBody);
    await this.logs.update(logId, extractAuditFields(payload));

    const institution = await this.authenticate(
      logId,
      payload,
      rawBody,
      signature,
    );
    const dto = this.validate(payload);

    const result = await this.payments.applyEvent(
      institution.id,
      toApplyEventInput(dto, logId),
    );
    if (result.kind === 'invoice_not_found') {
      this.logger.warn(
        `Tagihan ${dto.invoice_number} tidak ditemukan di ${institution.code} (event ${dto.event_id})`,
      );
    }
    return toWebhookOutcome(result, dto, institution.code, logId);
  }

  private parseJson(rawBody: Buffer): unknown {
    try {
      return JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new WebhookRejection(
        new BadRequestException('Body harus JSON valid'),
      );
    }
  }

  private async authenticate(
    logId: string,
    payload: unknown,
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<Institution> {
    const code = extractAuditFields(payload).institutionCode;
    const institution = code
      ? await this.institutions.findByCodeWithSecret(code)
      : null;
    if (!institution) {
      throw new WebhookRejection(
        new UnauthorizedException(INVALID_SIGNATURE),
        `Institusi tidak dikenal: ${code ?? '(kosong)'}`,
      );
    }
    await this.logs.update(logId, { institutionId: institution.id });

    if (!verifySignature(institution.webhookSecret, rawBody, signature)) {
      throw new WebhookRejection(new UnauthorizedException(INVALID_SIGNATURE));
    }
    await this.logs.update(logId, { signatureValid: true });
    return institution;
  }

  private validate(payload: unknown): PaymentWebhookDto {
    const dto = plainToInstance(PaymentWebhookDto, payload);
    const errors = validateSync(dto, { whitelist: true });
    if (errors.length === 0) return dto;

    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    throw new WebhookRejection(
      new BadRequestException(messages),
      `Payload tidak valid: ${messages.join('; ')}`,
    );
  }
}
