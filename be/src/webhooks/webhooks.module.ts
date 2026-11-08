import { Module } from '@nestjs/common';
import { InstitutionsModule } from '../institutions/institutions.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { WebhookLogsController } from './webhook-logs.controller';
import { WebhookLogsRepository } from './webhook-logs.repository';
import { WebhookLogsService } from './webhook-logs.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [InstitutionsModule, InvoicesModule],
  controllers: [WebhooksController, WebhookLogsController],
  providers: [WebhooksService, WebhookLogsService, WebhookLogsRepository],
})
export class WebhooksModule {}
