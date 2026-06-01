import { Module } from '@nestjs/common';
import { SuperAdminService } from './application/super-admin.service';
import { SuperAdminController } from './presentation/super-admin.controller';

@Module({
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
