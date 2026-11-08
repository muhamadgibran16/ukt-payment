import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InstitutionId } from '../common/decorators/institution-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { InvoicesService } from './invoices.service';

@ApiTags('Mahasiswa')
@ApiBearerAuth()
@Roles(Role.STUDENT)
@Controller('me/invoices')
export class MyInvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /** Status tagihan & riwayat transaksi milik sendiri (student id dari JWT). */
  @Get()
  async mine(
    @InstitutionId() institutionId: string,
    @CurrentUser('sub') studentId: string,
  ) {
    const { invoices } = await this.invoicesService.listForStudent(
      institutionId,
      studentId,
    );
    return invoices;
  }
}
