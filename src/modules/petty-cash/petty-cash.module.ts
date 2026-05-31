import { Module } from '@nestjs/common';
import { PettyCashService } from './application/petty-cash.service';
import { PettyCashController } from './presentation/petty-cash.controller';

@Module({
  controllers: [PettyCashController],
  providers: [PettyCashService],
  exports: [PettyCashService],
})
export class PettyCashModule {}
