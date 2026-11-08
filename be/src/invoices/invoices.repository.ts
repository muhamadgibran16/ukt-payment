import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceStatus } from './enums/invoice-status.enum';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';

/**
 * Akses data tagihan. SETIAP method mewajibkan `institutionId` sebagai
 * parameter pertama: tidak ada jalan membaca tagihan tanpa scope institusi.
 */
@Injectable()
export class InvoicesRepository {
  private readonly repo: Repository<Invoice>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Invoice);
  }

  findPaginated(
    institutionId: string,
    query: ListInvoicesQueryDto,
  ): Promise<[Invoice[], number]> {
    const base: FindOptionsWhere<Invoice> = { institutionId };
    if (query.status) base.status = query.status;
    if (query.semester) base.semester = query.semester;

    const search = query.search?.trim();
    const where = search
      ? [
          { ...base, invoiceNumber: ILike(`%${search}%`) },
          { ...base, student: { name: ILike(`%${search}%`) } },
          { ...base, student: { nim: ILike(`%${search}%`) } },
        ]
      : base;

    return this.repo.findAndCount({
      where,
      relations: { student: true },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });
  }

  findDetail(institutionId: string, id: string): Promise<Invoice | null> {
    return this.repo.findOne({
      where: { institutionId, id },
      relations: { student: true, transactions: true },
      order: { transactions: { createdAt: 'ASC' } },
    });
  }

  findByStudent(institutionId: string, studentId: string): Promise<Invoice[]> {
    return this.repo.find({
      where: { institutionId, studentId },
      relations: { transactions: true },
      order: { semester: 'DESC', transactions: { createdAt: 'ASC' } },
    });
  }

  async summarize(
    institutionId: string,
  ): Promise<{ status: InvoiceStatus; count: number; amount: number }[]> {
    const rows = await this.repo
      .createQueryBuilder('i')
      .select('i.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(i.amount), 0)', 'amount')
      .where('i.institution_id = :institutionId', { institutionId })
      .groupBy('i.status')
      .getRawMany<{ status: InvoiceStatus; count: string; amount: string }>();
    return rows.map((r) => ({
      status: r.status,
      count: Number(r.count),
      amount: Number(r.amount),
    }));
  }

  insert(
    institutionId: string,
    data: Pick<
      Invoice,
      'studentId' | 'invoiceNumber' | 'semester' | 'amount' | 'expiresAt'
    >,
  ): Promise<Invoice> {
    return this.repo.save(
      this.repo.create({
        ...data,
        institutionId,
        status: InvoiceStatus.UNPAID,
      }),
    );
  }
}
