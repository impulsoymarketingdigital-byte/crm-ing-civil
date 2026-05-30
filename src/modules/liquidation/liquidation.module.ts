import { Module } from '@nestjs/common';
import { LiquidationService } from './application/liquidation.service';
import { LiquidationController } from './presentation/liquidation.controller';

@Module({
  controllers: [LiquidationController],
  providers: [LiquidationService],
  exports: [LiquidationService],
})
export class LiquidationModule {}
