import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiHeader, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Notifikasi pembayaran dari payment gateway. Diautentikasi dengan
   * HMAC-SHA256 (bukan JWT). Body sengaja TIDAK di-bind ke DTO oleh Nest:
   * signature harus dihitung dari body mentah, dan payload yang ditolak tetap
   * harus tercatat utuh di audit log. Lihat docs/WEBHOOK.md.
   */
  @Public()
  @SkipThrottle()
  @Post('payment-gateway')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Webhook received')
  @ApiHeader({
    name: 'X-Signature',
    required: true,
    description: 'hex(HMAC-SHA256(secret_institusi, raw_body))',
  })
  @ApiBody({ type: PaymentWebhookDto })
  receive(
    @Req() req: Request,
    @Headers('x-signature') signature: string | undefined,
  ) {
    return this.webhooksService.handle({
      // Diisi express.raw() yang dipasang khusus untuk route webhook (bootstrap.ts).
      rawBody: Buffer.isBuffer(req.body) ? req.body : undefined,
      signature,
      sourceIp: req.ip,
    });
  }
}
