import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { InvoiceExpiryService } from './invoice-expiry.service';
import { InvoicePaymentService } from './invoice-payment.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesRepository } from './invoices.repository';
import { InvoicesService } from './invoices.service';
import { MyInvoicesController } from './my-invoices.controller';

@Module({
  imports: [UsersModule],
  controllers: [InvoicesController, MyInvoicesController],
  providers: [
    InvoicesRepository,
    InvoicesService,
    InvoicePaymentService,
    InvoiceExpiryService,
  ],
  exports: [InvoicesService, InvoicePaymentService, InvoiceExpiryService],
})
export class InvoicesModule {}
