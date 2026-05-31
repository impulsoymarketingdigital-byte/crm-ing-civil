import { Module } from '@nestjs/common';
import { TaxesService } from './application/taxes.service';
import { TaxesController } from './presentation/taxes.controller';

@Module({
  controllers: [TaxesController],
  providers: [TaxesService],
  exports: [TaxesService],
})
export class TaxesModule {}
