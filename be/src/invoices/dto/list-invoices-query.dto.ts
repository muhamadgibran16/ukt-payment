import { IsEnum, IsOptional, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { InvoiceStatus } from '../enums/invoice-status.enum';

export class ListInvoicesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @Matches(/^\d{4}[12]$/)
  semester?: string;
}
