import { Injectable } from '@nestjs/common';
import { Paginated } from '../common/pagination/paginated';
import { ListWebhookLogsQueryDto } from './dto/list-webhook-logs-query.dto';
import { WebhookLog } from './entities/webhook-log.entity';
import { WebhookLogsRepository } from './webhook-logs.repository';

@Injectable()
export class WebhookLogsService {
  constructor(private readonly logs: WebhookLogsRepository) {}

  async list(
    institutionId: string,
    query: ListWebhookLogsQueryDto,
  ): Promise<Paginated<WebhookLog>> {
    const [items, total] = await this.logs.findPaginated(institutionId, {
      status: query.status,
      skip: query.skip,
      take: query.limit,
    });
    return new Paginated(items, total, query.page, query.limit);
  }
}
