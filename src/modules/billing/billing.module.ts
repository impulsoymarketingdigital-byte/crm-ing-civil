import { Module } from '@nestjs/common';
import { BillingService } from './application/billing.service';
import { BillingController } from './presentation/billing.controller';

@Module({
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
