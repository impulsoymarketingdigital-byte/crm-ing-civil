import { Module } from '@nestjs/common';
import { SubscriptionService } from './application/subscription.service';
import { SubscriptionController } from './presentation/subscription.controller';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
