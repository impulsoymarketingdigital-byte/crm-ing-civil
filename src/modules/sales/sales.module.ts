import { Module } from '@nestjs/common';
import { CustomerService } from './application/customer.service';
import { InvoiceService } from './application/invoice.service';
import { CustomerController, InvoiceController } from './presentation/sales.controller';

@Module({
  controllers: [CustomerController, InvoiceController],
  providers: [CustomerService, InvoiceService],
  exports: [CustomerService, InvoiceService],
})
export class SalesModule {}
