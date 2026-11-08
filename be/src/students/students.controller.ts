import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InstitutionId } from '../common/decorators/institution-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { Role } from '../users/enums/role.enum';
import { UsersService } from '../users/users.service';

@ApiTags('Students (admin keuangan)')
@ApiBearerAuth()
@Roles(Role.FINANCE_ADMIN)
@Controller('students')
export class StudentsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly invoicesService: InvoicesService,
  ) {}

  /** Daftar mahasiswa institusi admin (untuk form pembuatan tagihan). */
  @Get()
  list(
    @InstitutionId() institutionId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.usersService.findStudents(institutionId, query);
  }

  /** Status tagihan & riwayat transaksi seorang mahasiswa. */
  @Get(':id/invoices')
  invoices(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) studentId: string,
  ) {
    return this.invoicesService.listForStudent(institutionId, studentId);
  }
}
