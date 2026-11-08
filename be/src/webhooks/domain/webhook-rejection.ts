import { HttpException } from '@nestjs/common';

/**
 * Webhook ditolak secara wajar (bukan error sistem): payload rusak, signature
 * salah, institusi tidak dikenal. Membawa respons HTTP untuk gateway dan alasan
 * internal yang lebih detail untuk audit log.
 */
export class WebhookRejection extends Error {
  constructor(
    readonly response: HttpException,
    readonly reason: string = response.message,
  ) {
    super(reason);
  }
}
