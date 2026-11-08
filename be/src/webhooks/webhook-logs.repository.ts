import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { WebhookLogStatus } from './domain/webhook-log-status.enum';
import { WebhookLog } from './entities/webhook-log.entity';

@Injectable()
export class WebhookLogsRepository {
  private readonly repo: Repository<WebhookLog>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(WebhookLog);
  }

  /** Dicatat sebelum validasi apa pun; institusi belum diketahui. */
  createReceived(data: Partial<WebhookLog>): Promise<WebhookLog> {
    return this.repo.save(
      this.repo.create({
        ...data,
        processingStatus: WebhookLogStatus.RECEIVED,
      }),
    );
  }

  async update(id: string, data: Partial<WebhookLog>): Promise<void> {
    await this.repo.update({ id }, data);
  }

  async complete(
    id: string,
    result: { status: WebhookLogStatus; responseCode: number; message: string },
  ): Promise<void> {
    await this.repo.update(
      { id },
      {
        processingStatus: result.status,
        responseCode: result.responseCode,
        message: result.message,
        processedAt: new Date(),
      },
    );
  }

  findPaginated(
    institutionId: string,
    opts: { status?: WebhookLogStatus; skip: number; take: number },
  ): Promise<[WebhookLog[], number]> {
    const where: FindOptionsWhere<WebhookLog> = { institutionId };
    if (opts.status) where.processingStatus = opts.status;
    return this.repo.findAndCount({
      where,
      order: { receivedAt: 'DESC' },
      skip: opts.skip,
      take: opts.take,
    });
  }
}
