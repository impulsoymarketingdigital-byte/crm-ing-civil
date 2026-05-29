import { Module } from '@nestjs/common';
import { TenantsService } from './application/tenants.service';
import { TenantsController } from './presentation/tenants.controller';
import { TenantsRepository } from './infrastructure/tenants.repository';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository],
  exports: [TenantsService],
})
export class TenantsModule {}
