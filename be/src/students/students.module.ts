import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { UsersModule } from '../users/users.module';
import { StudentsController } from './students.controller';

@Module({
  imports: [UsersModule, InvoicesModule],
  controllers: [StudentsController],
})
export class StudentsModule {}
