import { Module } from '@nestjs/common';
import { SecopService } from './application/secop.service';
import { SecopController } from './presentation/secop.controller';

@Module({
  controllers: [SecopController],
  providers: [SecopService],
  exports: [SecopService],
})
export class SecopModule {}
