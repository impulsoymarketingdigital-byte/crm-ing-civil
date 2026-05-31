import { Module } from '@nestjs/common';
import { AccountingService } from './application/accounting.service';
import { AccountingController } from './presentation/accounting.controller';

@Module({
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
