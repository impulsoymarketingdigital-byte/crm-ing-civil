import { Module } from '@nestjs/common';
import { PdfService } from './application/pdf.service';
import { PdfController } from './presentation/pdf.controller';
import { LiquidationModule } from '../liquidation/liquidation.module';

@Module({
  imports: [LiquidationModule],
  controllers: [PdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
