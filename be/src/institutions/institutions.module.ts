import { Module } from '@nestjs/common';
import { InstitutionsRepository } from './institutions.repository';

@Module({
  providers: [InstitutionsRepository],
  exports: [InstitutionsRepository],
})
export class InstitutionsModule {}
