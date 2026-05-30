import { Module } from '@nestjs/common';
import { BudgetService } from './application/budget.service';
import { BudgetController } from './presentation/budget.controller';

@Module({
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
