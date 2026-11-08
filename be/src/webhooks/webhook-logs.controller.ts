import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InstitutionId } from '../common/decorators/institution-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { ListWebhookLogsQueryDto } from './dto/list-webhook-logs-query.dto';
import { WebhookLogsService } from './webhook-logs.service';

@ApiTags('Webhook logs (admin keuangan)')
@ApiBearerAuth()
@Roles(Role.FINANCE_ADMIN)
@Controller('webhook-logs')
export class WebhookLogsController {
  constructor(private readonly webhookLogsService: WebhookLogsService) {}

  @Get()
  list(
    @InstitutionId() institutionId: string,
    @Query() query: ListWebhookLogsQueryDto,
  ) {
    return this.webhookLogsService.list(institutionId, query);
  }
}
