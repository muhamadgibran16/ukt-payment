import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { WebhookLogStatus } from '../domain/webhook-log-status.enum';

export class ListWebhookLogsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(WebhookLogStatus)
  status?: WebhookLogStatus;
}
