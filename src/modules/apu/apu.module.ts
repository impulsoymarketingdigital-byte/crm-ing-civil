import { Module } from '@nestjs/common';
import { ApuService } from './application/apu.service';
import { ApuController } from './presentation/apu.controller';

@Module({
  controllers: [ApuController],
  providers: [ApuService],
  exports: [ApuService],
})
export class ApuModule {}
