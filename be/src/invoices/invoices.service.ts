import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { uniqueViolationConstraint } from '../common/database/pg-errors';
import { Paginated } from '../common/pagination/paginated';
import { UsersService } from '../users/users.service';
import { defaultInvoiceNumber } from './domain/invoice-number';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { Invoice } from './entities/invoice.entity';
import { InvoiceStatus } from './enums/invoice-status.enum';
import { InvoicesRepository } from './invoices.repository';

export type InvoiceSummary = Record<
  InvoiceStatus,
  { count: number; amount: number }
>;

const emptySummary = (): InvoiceSummary => ({
  [InvoiceStatus.UNPAID]: { count: 0, amount: 0 },
  [InvoiceStatus.PAID]: { count: 0, amount: 0 },
  [InvoiceStatus.EXPIRED]: { count: 0, amount: 0 },
});

function assertInFuture(expiresAt: Date): void {
  if (expiresAt.getTime() <= Date.now()) {
    throw new BadRequestException('Tanggal kedaluwarsa harus di masa depan');
  }
}

const CONFLICT_MESSAGES: Record<string, string> = {
  UQ_invoices_institution_number:
    'Nomor tagihan sudah dipakai di institusi ini',
  UQ_invoices_institution_student_semester:
    'Mahasiswa sudah memiliki tagihan untuk semester ini',
};

function toConflictException(error: unknown): ConflictException | null {
  const constraint = uniqueViolationConstraint(error);
  if (constraint === null) return null;
  return new ConflictException(
    CONFLICT_MESSAGES[constraint] ?? 'Tagihan sudah ada',
  );
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly usersService: UsersService,
  ) {}

  async list(
    institutionId: string,
    query: ListInvoicesQueryDto,
  ): Promise<Paginated<Invoice>> {
    const [items, total] = await this.invoicesRepository.findPaginated(
      institutionId,
      query,
    );
    return new Paginated(items, total, query.page, query.limit);
  }

  async summary(institutionId: string): Promise<InvoiceSummary> {
    const rows = await this.invoicesRepository.summarize(institutionId);
    const summary = emptySummary();
    for (const { status, count, amount } of rows)
      summary[status] = { count, amount };
    return summary;
  }

  async create(institutionId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    // Validasi kepemilikan: mahasiswa institusi lain diperlakukan "tidak ada".
    const student = await this.usersService.getStudent(
      institutionId,
      dto.studentId,
    );
    assertInFuture(dto.expiresAt);

    try {
      const invoice = await this.invoicesRepository.insert(institutionId, {
        studentId: student.id,
        semester: dto.semester,
        // NIM selalu ada untuk mahasiswa (CHK_users_student_nim).
        invoiceNumber:
          dto.invoiceNumber ?? defaultInvoiceNumber(dto.semester, student.nim!),
        amount: dto.amount,
        expiresAt: dto.expiresAt,
      });
      invoice.student = student;
      return invoice;
    } catch (error) {
      throw toConflictException(error) ?? error;
    }
  }

  async findOne(institutionId: string, id: string): Promise<Invoice> {
    const invoice = await this.invoicesRepository.findDetail(institutionId, id);
    // 404 (bukan 403) untuk tagihan institusi lain: tidak membocorkan keberadaannya.
    if (!invoice) throw new NotFoundException('Tagihan tidak ditemukan');
    return invoice;
  }

  async listForStudent(institutionId: string, studentId: string) {
    const student = await this.usersService.getStudent(
      institutionId,
      studentId,
    );
    const invoices = await this.invoicesRepository.findByStudent(
      institutionId,
      studentId,
    );
    return { student, invoices };
  }
}
