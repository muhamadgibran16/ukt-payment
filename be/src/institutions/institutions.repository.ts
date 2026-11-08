import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Institution } from './entities/institution.entity';

@Injectable()
export class InstitutionsRepository {
  private readonly repo: Repository<Institution>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Institution);
  }

  /**
   * Dipakai HANYA oleh webhook: institusi pengirim baru diketahui dari payload.
   * Satu-satunya tempat secret HMAC di-SELECT.
   */
  findByCodeWithSecret(code: string): Promise<Institution | null> {
    return this.repo
      .createQueryBuilder('i')
      .addSelect('i.webhookSecret')
      .where('i.code = :code', { code })
      .getOne();
  }
}
