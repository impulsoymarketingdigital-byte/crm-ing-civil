import { Module } from '@nestjs/common';
import { LedgerService } from './application/ledger.service';
import { LedgerController } from './presentation/ledger.controller';

@Module({
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
