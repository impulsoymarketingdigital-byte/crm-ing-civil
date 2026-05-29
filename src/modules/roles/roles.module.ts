import { Module } from '@nestjs/common';
import { RolesService } from './application/roles.service';
import { RolesController } from './presentation/roles.controller';
import { RolesRepository } from './infrastructure/roles.repository';

@Module({
  controllers: [RolesController],
  providers: [RolesService, RolesRepository],
  exports: [RolesService],
})
export class RolesModule {}
