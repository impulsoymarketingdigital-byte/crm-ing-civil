import { Module } from '@nestjs/common';
import { PayrollService } from './application/payroll.service';
import { PayrollController } from './presentation/payroll.controller';

@Module({
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
