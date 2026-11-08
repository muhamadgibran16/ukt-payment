import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InstitutionId } from '../common/decorators/institution-id.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices (admin keuangan)')
@ApiBearerAuth()
@Roles(Role.FINANCE_ADMIN)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /** Daftar tagihan dengan filter status, semester, dan pencarian. */
  @Get()
  list(
    @InstitutionId() institutionId: string,
    @Query() query: ListInvoicesQueryDto,
  ) {
    return this.invoicesService.list(institutionId, query);
  }

  /** Jumlah & total nominal tagihan per status. */
  @Get('summary')
  summary(@InstitutionId() institutionId: string) {
    return this.invoicesService.summary(institutionId);
  }

  @Post()
  @ResponseMessage('Tagihan berhasil dibuat')
  create(
    @InstitutionId() institutionId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(institutionId, dto);
  }

  /** Detail tagihan beserta riwayat transaksinya. */
  @Get(':id')
  findOne(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.findOne(institutionId, id);
  }
}
