import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { PayablesService, CreateVendorDto, CreatePurchaseInvoiceDto, PayVendorDto } from '../application/payables.service';

@UseGuards(JwtAuthGuard)
@Controller('payables')
export class PayablesController {
  constructor(private readonly svc: PayablesService) {}

  @Get('vendors')
  listVendors(@TenantId() t: string) { return this.svc.findAllVendors(t); }

  @Post('vendors')
  createVendor(@Body() dto: CreateVendorDto, @TenantId() t: string) { return this.svc.createVendor(t, dto); }

  @Patch('vendors/:id/deactivate')
  deactivateVendor(@Param('id', ParseUUIDPipe) id: string, @TenantId() t: string) { return this.svc.deactivateVendor(id, t); }

  @Get('invoices')
  listInvoices(@TenantId() t: string, @Query('status') status?: string) { return this.svc.findAllInvoices(t, status); }

  @Get('invoices/:id')
  getInvoice(@Param('id', ParseUUIDPipe) id: string, @TenantId() t: string) { return this.svc.findInvoice(id, t); }

  @Post('invoices')
  createInvoice(@Body() dto: CreatePurchaseInvoiceDto, @TenantId() t: string) { return this.svc.createPurchaseInvoice(t, dto); }

  @Post('invoices/:id/pay')
  payInvoice(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PayVendorDto, @TenantId() t: string) {
    return this.svc.payInvoice(id, t, dto);
  }

  @Get('payments')
  listPayments(@TenantId() t: string) { return this.svc.findAllPayments(t); }
}
